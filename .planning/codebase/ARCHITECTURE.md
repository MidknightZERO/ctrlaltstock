# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Pipeline-driven blog automation with a deterministic backfill layer. The codebase follows a 3-layer intent (directives → orchestration → execution) but execution lives entirely under `bot/`; there is no top-level `execution/` directory.

**Key Characteristics:**
- **New content:** Story ingestion (Reddit, RSS, NewsAPI, GiantBomb) → AI draft → refine → edit → images → Amazon links → publish → optional backfill and git push.
- **Existing content:** Validation and fix-list generation feed into a single backfill script that can run in multiple modes (tags, links, images, etc.).
- **Deduplication:** Source-level only (seen_posts DB + title/tag similarity vs existing posts). No check of article body against existing content.
- **Images:** Per-article assignment (cover + extras) with shared anti-reuse (used_images.json, recent covers from blog-posts.json). Backfill can refresh covers using AI-generated search terms from a fix list.

---

## Layers

**Orchestration (scheduler):**
- Purpose: Run the full new-article pipeline and optionally backfill after publish.
- Location: `bot/scheduler.py`
- Depends on: scraper, ai_writer, ai_refiner, validate_topic, ai_editor, fact_check, amazon_linker, image_fetcher, hero_validate, publisher, backfill_content.
- Used by: Cron / Task Scheduler (recommended: `python bot/scheduler.py --once`).

**Execution (bot scripts):**
- Purpose: Scrape, write, refine, edit, fact-check, link, fetch images, publish, and backfill.
- Location: `bot/*.py` (all Python automation).
- Depends on: `bot/config.py`, `bot/.env`, repo paths (`config.git.repo_path`, `config.bot.posts_dir`, `config.bot.blog_json_path`).
- Used by: scheduler, manual runs, `bot/run-fix-existing.ps1`.

**Directives:**
- Purpose: SOPs for scraping and fact-checking (e.g. which script to use, config location).
- Location: `bot/directives/` (e.g. `scrape.md`, `fact_check.md`). Note: `scrape.md` references `execution/scraper.py` but the actual script is `bot/scraper.py`; there is no `execution/` folder at repo root.

**Frontend / build:**
- Purpose: Consume markdown and produce static blog data and app bundle.
- Location: `src/`, `scripts/build-blog.js`, `vite.config.ts`.
- Depends on: `src/blog/posts/*.md`, `public/affiliate-products.json`.
- Used by: `npm run build:blog`, `npm run build`, deployment.

---

## Full Content Pipeline

### 1. Article creation / ingestion

**Source ingestion (no duplicate check against article body):**
- **Scraper** (`bot/scraper.py`): Pulls candidates from Reddit (PRAW or keyless), RSS, NewsAPI, GiantBomb. Uses SQLite `seen_posts` (id + normalized title) so the same post is not processed twice. Filters by relevance keywords and recency (`config.rss.lookback_hours`).
- **Deduplication vs existing blog:** Loads `public/blog-posts.json`, keeps posts from last 7 days (`SIMILARITY_LOOKBACK_DAYS`). For each candidate, computes `similarity_to_existing` (word overlap between story title and existing title+tags). If ≥ `SIMILARITY_THRESHOLD` (0.6), candidate is skipped (“already covered”). Within a single run, `get_top_stories` also skips candidates too similar to already-selected stories (`WITHIN_RUN_SIMILARITY_THRESHOLD` 0.5).
- **Gap:** There is no comparison of generated article body or content to existing posts. Duplicate or near-duplicate content can still be published if titles/tags differ enough.

**Pipeline (per story) — execution order:**
1. **scraper** (`get_top_stories`) → list of StoryBriefs (no mark-seen yet).
2. **ai_writer** → first draft from story.
3. **ai_refiner** → refine with relevant context.
4. **validate_topic** → reject if body does not match title/seed.
5. **ai_editor** → editorial pass + internal linking (relatedPostSlugs).
6. **fact_check** (optional) → DuckDuckGo on claims; log only.
7. **amazon_linker** → find products, set `amazonProducts` (before images so product images can be used).
8. **image_fetcher** → set `coverImage` and `images` (see Images below).
9. **hero_validate** (optional) → Groq Vision; swap cover if not suitable for overlay.
10. **publisher** → write `src/blog/posts/<slug>.md`, run `npm run build:blog`, git add/commit/push, optional build hook, Discord.
11. **mark_story_seen** (after successful publish) → record in `seen_posts`.

After at least one successful publish in a run, scheduler runs **backfill** (tags=False, links=True, amazon_links=False, inline_images=True) then git push. So: new posts are written first; then backfill adds internal links and inline images across the repo; then one commit for “cron: backfill + new posts”.

### 2. Images: per-article vs shared

**Per-article assignment (new posts):**
- **image_fetcher** (`bot/image_fetcher.py`): For each draft, sets `frontmatter.coverImage` (single URL) and `frontmatter.images` (up to 3 more). Sources, in order: (1) Query-based search — `image_search_queries` or title + amazon search terms; Unsplash for new posts, Pexels for backfill; (2) Amazon product images from the draft (topic-sorted); (3) Topic-aligned pool from `bot/stock_images.json` (tag hierarchy). Excludes cover URLs used in the last N days (`blog-posts.json`, `image_reuse_lookback_days`, default 7) and prefers least-recently-used from `bot/used_images.json`. So images are chosen per article but with global anti-reuse.

**Shared resources:**
- **stock_images.json** (`bot/stock_images.json`): Curated Unsplash URLs by tag/main group (e.g. Hardware/Graphics Cards, Console, Deals). Shared across all articles when query/product images are insufficient.
- **used_images.json** (`bot/used_images.json`): Rolling list of last 50 cover URLs used; updated whenever a new cover is chosen.

**Backfill cover images:**
- **backfill_content.py --images-only**: Re-fetches cover (and images) for each existing post. If `bot/.tmp/fix-list.json` exists (from `generate_fix_list.py`), uses `image_search_queries` per slug for topic-relevant Pexels search; otherwise uses title/fallback. Uses same 7-day exclusion of recent covers. Then calls `rebuild_blog_json`.

### 3. Backfill / content-enrichment flow

**Script:** `bot/backfill_content.py`. Zero AI except when used with fix-list (fix-list itself is from `generate_fix_list.py`, which uses AI).

**Inputs (optional but recommended for correct behavior):**
- **Validation report** (`bot/.tmp/validation-report.json`): Produced by `validate_existing_content.py`. Contains per-post flags (e.g. `link_distribution_skewed`). Backfill uses this for distribution-aware internal linking (spread links across first 30% vs last 70% when skewed).
- **Fix list** (`bot/.tmp/fix-list.json`): Produced by `generate_fix_list.py`. Maps slug → `image_search_queries`. Used only by `backfill_content.py --images-only` for topic-aware cover refresh.

**Backfill modes (flags):**
- Default (no flags): tags + internal links + Amazon links + inline images + featured product; excerpt fixes (placeholder, mismatched).
- `--tags-only`, `--links-only`, `--no-amazon-links`, `--amazon-links-only`, `--fix-amazon-images`, `--images-only`, `--inline-images-only`, `--no-inline-images`, etc.

**Internal order within one `run_backfill()` call (when not `--images-only`):**
1. Excerpt fixes (mismatched, then placeholder).
2. Tags (infer from content if empty).
3. Internal links (phrase index from all posts; strip then re-insert; use validation report for distribution if present).
4. Amazon links (phrase match from post’s amazonProducts or affiliate-products.json).
5. Inline images + featured product block.

Then, if anything changed, `rebuild_blog_json` is called. For `--images-only`, backfill only re-fetches covers (using fix list if present) and then runs `rebuild_blog_json`.

---

## Execution Order and Dependencies

### New-article pipeline (scheduler)

```
bot/scheduler.py --once
  → resume partial draft? (bot/.tmp/drafts/) — if yes, resume_from_step and exit
  → get_top_stories(n) from bot/scraper.py
  → for each story:
       ai_writer → ai_refiner → validate_topic → ai_editor → fact_check
       → amazon_linker → image_fetcher → hero_validate → publisher
       → on success: mark_story_seen(story)
  → if any success: backfill_content.run_backfill(tags=False, links=True, amazon_links=False, inline_images=True)
  → git_commit_and_push
```

**Critical order:** Amazon before images (so product images can be used); publish after images; backfill after publish so new posts are on disk before backfill runs.

### Fix-existing (one-time or manual)

**Script:** `bot/run-fix-existing.ps1`. Run from repo root.

```
1. validate_existing_content.py     → writes bot/.tmp/validation-report.json
2. generate_fix_list.py            → writes bot/.tmp/fix-list.json (AI)
3. backfill_content.py              → tags, links, excerpts, inline images, featured product (reads validation-report)
4. backfill_content.py --images-only → refresh covers (reads fix-list.json)
5. npm run build:blog               → regenerate public/blog-posts.json
```

**Dependency:** Step 3 and 4 must run after 1 and 2 so validation report and fix list exist. Step 4 must run after step 3 if you want excerpt/link fixes applied before refreshing covers. Step 5 must run after any step that changes `src/blog/posts/*.md` or you will serve stale JSON.

### Other scripts (no strict pipeline order)

- **resume_draft.py**: Loads a partial draft from `bot/.tmp/drafts/`, continues from last step (writer → … → publish). Run after a scheduler crash.
- **reprocess_rejected.py**: Runs top N rejected candidates (from scraper’s rejected_candidates.jsonl) through the full pipeline; can publish.
- **fix_affiliate_images.py**: Fills empty `imageUrl` in `public/affiliate-products.json` via Amazon; independent of backfill.
- **validate_existing_content.py --fix**: Applies H1 link strip and partial-word link removal and still writes validation-report.json for backfill.

---

## Data Flow

**Stories → Draft → Markdown → JSON:**
- Scraper outputs StoryBrief (title, summary, source_url, raw_content, …).
- AI + editor produce a draft dict (frontmatter + content).
- Publisher writes `src/blog/posts/<slug>.md` (frontmatter + content).
- `scripts/build-blog.js` reads all `*.md` in `src/blog/posts/`, outputs `public/blog-posts.json` (and categories). Scraper and backfill read `blog-posts.json` for existing posts and recent cover URLs.

**State:**
- **seen_posts.db** (`bot/seen_posts.db`): Source-level dedup; updated when a story is marked seen (after publish).
- **used_images.json**, **blog-posts.json**: Image anti-reuse and similarity/diversity use recent posts and recent covers.
- **.tmp/drafts**: Partial drafts for resume; **.tmp/validation-report.json** and **.tmp/fix-list.json** for backfill.

---

## Key Abstractions

**StoryBrief / draft:** Dict with frontmatter (title, tags, slug, coverImage, images, amazonProducts, relatedPostSlugs, …) and content (markdown body). Passed through writer → refiner → editor → amazon_linker → image_fetcher → publisher.

**Phrase index (internal links):** List of (phrase, slug, url) from all posts; longer phrases first. Used by backfill to insert internal links by phrase match with distribution awareness when validation report flags skew.

**Fix list / validation report:** Machine-readable JSON for backfill. Fix list drives image search terms for `--images-only`; validation report drives distribution-aware linking.

---

## Entry Points

| Entry point | Location | Trigger | Responsibility |
|------------|----------|---------|----------------|
| Scheduler (cron) | `bot/scheduler.py` | `--once` or `--daemon` | Run pipeline for top N stories, optional backfill, git push |
| Fix existing | `bot/run-fix-existing.ps1` | Manual / one-off | Validate → fix list → backfill → backfill --images-only → build:blog |
| Resume draft | `bot/resume_draft.py` | Manual after crash | Continue from last step to publish |
| Publish single | `bot/publisher.py` | stdin JSON | Write .md, build:blog, git push, notify |
| Build blog JSON | `scripts/build-blog.js` | `npm run build:blog` | Read all posts, write public/blog-posts.json |

---

## Error Handling

- **Pipeline crash:** Scheduler saves partial draft to `bot/.tmp/drafts/` with last step and error; logs and optionally notifies Discord. Resume via `resume_draft.py`.
- **Backfill:** Exceptions in scheduler’s post-publish backfill are caught and logged (non-fatal); git push still attempted.
- **Scraper:** DB and API errors logged; keyless Reddit fallback if PRAW fails.

---

## Cross-Cutting Concerns

**Logging:** Rotating file handlers in `bot/logs/` (scheduler.log, backfill.log, scraper.log, etc.) plus console.

**Validation:** Topic consistency (validate_topic) before publish; fact_check and hero_validate log only. No body-level duplicate content check.

**Authentication / secrets:** `.env` in `bot/` (and optionally repo root); config reads via `config.py` (OpenRouter, Reddit, NewsAPI, Amazon, Unsplash, Pexels, Groq, Discord, etc.).

---

*Architecture analysis: 2026-03-01*
