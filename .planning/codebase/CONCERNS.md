# Codebase Concerns

**Analysis Date:** 2026-03-01

---

## 1. Image Workflow Concerns

### 1.1 Same image reused across articles

- **Issue:** The same Unsplash photo IDs appear as cover and inline images across many unrelated articles. Examples: `photo-1555617981-dac3880eac6e` (laptop/tech) and `photo-1486572788966-cfd3df1f5b42` (office/workspace) are used in dozens of posts including GPU, Nintendo, Xbox, and corporate/finance articles.
- **Files:** `public/blog-posts.json` (repeated URLs at lines 287, 472, 594, 667, 723, 864, 1300, 1705, 1948, 2147, 2394, 2467, 2559, 2760, 3022, 3092, 3180, 3273, 3430, 3500, 3627, 4045, 4134, 4341, 4815, 4888, 4952, 5204, 5418, 5489, 5568, 5780, 6639, 6752 and others); `src/blog/posts/*.md` (e.g. `avatar-last-airbender-game-9-99-amazon.md`, `grand-theft-auto-vi-title-ids-have-been-added-to-the-playstation-database.md`, `what-do-you-think-about-the-visual-style-not-layout-of-the-current-xbox-dashboar.md`).
- **Root cause:** Anti-reuse is limited to (1) last 50 URLs in `used_images.json` (`bot/image_fetcher.py` lines 39, 88–95, 384–386) and (2) cover images from posts published in the last N days only (`_load_recent_cover_images`, `config.bot.image_reuse_lookback_days` default 7) in `bot/image_fetcher.py` lines 114–132, 291. There is no check against **all** existing posts in `blog-posts.json` or all markdown files, so images from older or same-day posts are freely reused.
- **Impact:** Readers see the same stock photo across many articles; reduces perceived quality and distinctiveness.
- **Fix approach:** In `fetch_images`, load cover image URLs from the full `blog-posts.json` (or scan all posts in `posts_dir`) and add those bases to `exclude_bases` / `recent_cover_bases`. Optionally increase `USED_IMAGES_MAX` or persist a global "already used" set keyed by image base URL.

### 1.2 Irrelevant images (e.g. GPU image on CPU/corporate articles)

- **Issue:** Articles receive generic or topic-mismatched cover images (e.g. gaming/GPU imagery on corporate/finance or CPU-focused posts) because fallbacks are coarse and query cleaning is keyword-based.
- **Files:** `bot/image_fetcher.py`: `_clean_query_for_images` (lines 307–341) maps many product terms to a single phrase (e.g. first keyword match wins: "nvidia" -> "graphics card computer", "gpu" -> "graphics card gaming"); when `primary_topic` is "gpu" or "cpu", the function returns a fixed string ("graphics card gaming", "processor chip technology") even when the article is about earnings or corporate news. `bot/validate_existing_content.py`: `check_image_relevance` (lines 176–197) uses a simple heuristic (topic=game vs gpu signals in URL string); it only flags game vs GPU mismatch, not CPU vs GPU or corporate vs hardware.
- **Root cause:** (1) New posts get `image_search_queries` from the AI writer (`bot/ai_writer.py` lines 70, 74, 215, 357); if the model returns generic or wrong phrases, no validation corrects them. (2) When queries fail or are missing, `fetch_images` falls back to `[title] + (amazon_search_queries)[:2]` then to topic-aligned stock pools (`_get_pool_for_primary_topic`, `_get_pool_for_tags`) which are hardware-centric; see `bot/image_fetcher.py` lines 296, 352–361. (3) Topic inference can be wrong for hybrid articles (e.g. "Nvidia net income") so primary_topic forces a single pool.
- **Impact:** Corporate or CPU articles show GPU/gaming imagery; confuses readers and hurts credibility.
- **Fix approach:** Extend `check_image_relevance` to cover CPU vs GPU and "corporate/finance" vs hardware; optionally add a post-publish validation that suggests better `image_search_queries`. In `_clean_query_for_images`, avoid overriding with primary_topic when the query already contains strong topic signals (e.g. "earnings", "revenue"). Consider storing and reusing AI-generated `image_search_queries` in frontmatter for backfill so `--images-only` doesn't rely only on title.

### 1.3 Missing or wrong AI-generated search terms for Pexels/Unsplash

- **Issue:** Backfill image refresh often uses only article title (or title + Amazon queries) instead of topic-specific phrases, so Pexels/Unsplash return generic tech imagery. AI-generated `image_search_queries` are only used when a fix list is present and was generated first.
- **Files:** `bot/image_fetcher.py` line 296: `queries = draft.get("image_search_queries") or [title] + (draft.get("amazon_search_queries") or [])[:2]` — if `image_search_queries` is missing, title (and a couple of product queries) are used. `bot/backfill_content.py` lines 753–761: `backfill_cover_images` only injects `draft["image_search_queries"]` when `fix_list` exists and contains the slug; `fix_list` comes from `load_fix_list()` which reads `bot/.tmp/fix-list.json` written by `generate_fix_list.py`. `bot/generate_fix_list.py` lines 76–94, 131–149: AI returns per-slug `image_search_queries`; on API failure the fallback is `[title]` (lines 142, 148). No validation that returned phrases match article topic.
- **Root cause:** (1) `backfill_content.py --images-only` does not require or run `generate_fix_list.py`; if the user hasn't run it, `fix-list.json` is missing or stale and every post gets title-based search. (2) New posts: `ai_writer.py` asks for `image_search_queries` in the JSON block (lines 70, 74) but the model can omit or return generic phrases; `meta.get("image_search_queries", [])` (line 357) can be empty. (3) No automated check that Pexels/Unsplash results are topic-appropriate.
- **Impact:** Backfill and new posts end up with irrelevant or duplicate-looking images; fix list is underused because script order is easy to skip.
- **Fix approach:** Document and enforce order: run `generate_fix_list.py` before `backfill_content.py --images-only`. In the scheduler or a "fix existing" flow, optionally call `generate_fix_list` before image refresh. Validate AI-generated `image_search_queries` (e.g. must not be empty, should contain at least one phrase that matches primary topic). For new posts, validate or backfill `image_search_queries` in the draft before `fetch_images`.

---

## 2. Content Duplication Concerns

### 2.1 Lack of checks against existing content before publish/backfill

- **Issue:** Before publishing a new article, there is no check that the slug or a very similar title already exists. Backfill does not check "already has sufficient links/excerpts" in a way that would skip or avoid re-processing; it strips internal links and re-adds them, which can change distribution but doesn't prevent duplicate or near-duplicate articles from being written.
- **Files:** `bot/publisher.py` lines 64–76, 183–224: `write_post_file` builds `filepath = posts_dir / f"{slug}.md"` and writes without checking if the file already exists; `publish()` does not load existing posts or compare title/slug. `bot/backfill_content.py`: `add_links_to_post` (lines 403–421) strips existing internal links then re-adds up to `max_links`; there is no "skip if this post already has N links and is not flagged for distribution fix". `run_backfill` (lines 476–565) iterates all posts and applies fixes regardless of whether content was already fixed in a prior run.
- **Scraper-side:** `bot/scraper.py` does check similarity to existing posts before selecting a story (`load_existing_posts`, `similarity_to_existing`, `SIMILARITY_THRESHOLD` 0.6, lines 456–469, 718–764). So duplicate **story** selection is avoided, but duplicate **slug/title** at publish time is not.
- **Impact:** (1) Resuming a draft or manually running the pipeline with a story that was already published can overwrite an existing post (same slug). (2) Two runs with similar titles could produce two articles that are near-duplicates if the slugifier produces different slugs. (3) Backfill repeatedly touches all posts, which is by design but increases risk of unnecessary edits and merge churn.
- **Fix approach:** In `publisher.write_post_file` or `publish`, before writing: load existing posts (from `blog-posts.json` or scan `posts_dir`), check if `slug` already exists; if so, either abort with a clear error or require an explicit overwrite flag. Optionally check title similarity to an existing post and warn. For backfill, consider a "skip if unchanged" or "only posts missing links/excerpts" mode to reduce churn.

### 2.2 Backfill and publish do not deduplicate against full content set

- **Issue:** Scraper deduplication uses `blog-posts.json` and only considers posts from the last 7 days for similarity (`SIMILARITY_LOOKBACK_DAYS`). So an article that was published 8+ days ago is not considered "existing" for story filtering. Publisher and backfill never load the full content set to detect duplicate or near-duplicate articles.
- **Files:** `bot/scraper.py` lines 456–469, 718–764: `recent_posts = posts_from_last_n_days(existing_posts, SIMILARITY_LOOKBACK_DAYS)` (7 days); similarity is only computed against `recent_posts`. `bot/publisher.py`, `bot/backfill_content.py`: no loading of existing posts for duplicate detection.
- **Impact:** The same news (e.g. "Nvidia driver update") can be picked again after a week and result in a second, very similar article. Publisher can still overwrite by slug.
- **Fix approach:** Consider extending similarity check to a longer window or to all posts when the story title is very similar. Keep publish-time slug existence check as above.

---

## 3. Script Execution Order and Dependencies

### 3.1 Backfill and related scripts not run in the right order or with wrong dependencies

- **Issue:** Correct execution order for "fix existing posts" (including topic-relevant images and distribution-aware linking) is: (1) `validate_existing_content.py` -> produces `validation-report.json`; (2) `generate_fix_list.py` -> produces `fix-list.json`; (3) `backfill_content.py` (full or tags/excerpts/links); (4) `backfill_content.py --images-only`; (5) `npm run build:blog`. If (1) or (2) is skipped, backfill runs with empty reports and falls back to weaker behavior. The scheduler does not run (1) or (2) at all and does not run (4).
- **Files:** `bot/run-fix-existing.ps1` (lines 1–29): documents the correct order (1->2->3->4->5). `bot/backfill_content.py` lines 56–58, 61–69, 73–81: `VALIDATION_REPORT_PATH` and `FIX_LIST_PATH`; `load_validation_report()`, `load_fix_list()`; if files are missing, backfill proceeds with empty dicts. `bot/scheduler.py` lines 322–334: after publishing, it runs `run_backfill(tags=False, links=True, amazon_links=False, inline_images=True)` and then `git_commit_and_push`; it never runs `validate_existing_content` or `generate_fix_list`, and never runs `backfill_content --images-only`.
- **Impact:** (1) Cron users get distribution-aware linking only if they have run `validate_existing_content.py` at least once and the report is still present; otherwise `validation_report` is `{}`. (2) Image refresh with topic-specific queries never runs in the scheduler, so automated runs keep using title/fallback for images. (3) Users running `backfill_content.py --images-only` without first running `generate_fix_list.py` get no benefit from AI-generated search terms.
- **Fix approach:** Document in one place (e.g. `bot/CRON-SETUP.md` or `directives/`) the dependency graph: validate -> backfill (for report); generate_fix_list -> backfill --images-only (for fix list). Optionally: add a single script or scheduler step that runs validate + generate_fix_list (if needed) before backfill, and add an optional "image refresh" step that runs generate_fix_list then backfill --images-only. Fail or warn in backfill when --images-only is used and fix-list.json is missing or older than posts.

### 3.2 Validation report and fix list paths are implicit

- **Issue:** Backfill expects `bot/.tmp/validation-report.json` and `bot/.tmp/fix-list.json`. These paths are hardcoded in `backfill_content.py` and in `generate_fix_list.py` / `validate_existing_content.py`. If someone runs backfill from a different cwd or with a different repo layout, or if `.tmp` is cleared, the reports are missing and no error is raised.
- **Files:** `bot/backfill_content.py` lines 56–58: `VALIDATION_REPORT_PATH = _BOT_DIR / ".tmp" / "validation-report.json"`, `FIX_LIST_PATH = _BOT_DIR / ".tmp" / "fix-list.json"`. `bot/validate_existing_content.py` lines 35–37: `VALIDATION_REPORT_DIR = _BOT_DIR / ".tmp"`, `VALIDATION_REPORT_PATH = VALIDATION_REPORT_DIR / "validation-report.json"`. `bot/generate_fix_list.py` lines 35–36: `FIX_LIST_DIR = _BOT_DIR / ".tmp"`, `FIX_LIST_PATH = FIX_LIST_DIR / "fix-list.json"`.
- **Impact:** Silent fallback to empty data; users may think distribution-aware linking or image search terms are in use when they are not.
- **Fix approach:** Log a clear warning when backfill runs with missing validation report or (for --images-only) missing fix list. Optionally exit with non-zero when --images-only is used and fix list is missing, unless a flag like --no-fix-list is set.

---

## Tech Debt (summary)

- **Duplicate/legacy scripts:** `fix-markdown.js` (root) and `src/fix-markdown.js` (ESM) — identical logic, neither in package.json scripts. Remove or consolidate under `scripts/`.
- **Triple-source product data:** `src/blog/data/products.ts`, `src/blog/data/products.json`, `public/affiliate-products.json` — different schemas and no sync; bot uses affiliate-products, frontend uses others.
- **publisher.py:** Duplicate `sys` import (lines 16 and 31); `git add` only stages specific paths (lines 118–120) — previous concern about `git add -A` appears fixed in current code.
- **Empty or stale data:** `public/blog-categories.json` has empty categories; `ai_editor.py` falls back to tags. Fallback posts in `server.js` with hardcoded 2023 dates.

## Security Considerations

- **Secrets:** Ensure `bot/.env` is never committed; rotate any exposed keys. Restrict CORS and add auth/rate limiting on `server.js` if used in production.
- **Path traversal:** Validate slug in API routes (e.g. allow only `[a-z0-9-]+`) before using in paths.
- **Amazon scraping:** `amazon_linker.py` and backfill's `fix_amazon_images` use browser-like User-Agent; prefer PA-API where possible to reduce ToS risk and IP bans.

## Performance and Reliability

- **Process locking:** `scheduler.py` uses a PID lockfile (`LOCK_FILE`, lines 59–84); concurrent runs are avoided.
- **SQLite:** `scraper.py` uses WAL and busy timeout in `get_db()` (lines 52–54).
- **JSON writes:** `image_fetcher.py` uses atomic write for `used_images.json` (tmp file + `os.replace`, lines 102–110).
- **Log rotation:** Multiple handlers use `RotatingFileHandler` (e.g. scheduler, backfill, publisher); verify all critical logs are rotated.

## Test Coverage Gaps

- No automated tests for scraper dedup, build-blog parsing, publisher git steps, or image_fetcher query/fallback logic. High-value targets: `scraper.py` similarity and `load_existing_posts`, `backfill_content.py` link/image logic, `image_fetcher.py` query and reuse behavior.

---

*Concerns audit: 2026-03-01*
