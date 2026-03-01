# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**Image APIs (critical for cover/hero and inline images):**
- **Unsplash** — primary for new articles (50 req/h). Used for search; returns CDN URLs.
  - Config: `bot/config.py` → `UnsplashConfig`: `UNSPLASH_ACCESS_KEY`, `base_url = "https://api.unsplash.com"`.
  - Usage: `bot/image_fetcher.py` → `search_unsplash(query, count=3)`. GET `https://api.unsplash.com/search/photos` with `query`, `per_page`, `orientation=landscape`, `content_filter=high`; header `Authorization: Client-ID {UNSPLASH_ACCESS_KEY}`. Results → `result.urls.regular`; UTM params appended.
- **Pexels** — used for backfill only (higher limit, 200 req/h). Same role as Unsplash but for re-fetching existing posts.
  - Config: `bot/config.py` → `PexelsConfig`: `PEXELS_API_KEY`, `base_url = "https://api.pexels.com/v1"`.
  - Usage: `bot/image_fetcher.py` → `search_pexels(query, count=3)`. GET `https://api.pexels.com/v1/search` with `query`, `per_page`, `orientation=landscape`; header `Authorization: {PEXELS_API_KEY}`. Results → `photo.src.landscape` or `large`/`original`.

**AI / LLM:**
- **OpenRouter** — default AI provider for article writing and fix-list generation. Env: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (e.g. `meta-llama/llama-3.3-70b-instruct:free`). Used in `bot/ai_writer.py`, `bot/generate_fix_list.py`.
- **OpenAI** — optional direct provider; `OPENAI_API_KEY`, `OPENAI_MODEL`.
- **Ollama** — local LLM; `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.
- **Groq** — vision API for hero image validation (text-overlay suitability). Config: `bot/config.py` → `GroqConfig`: `GROQ_API_KEY`, `vision_model`. Used in `bot/hero_validate.py`.

**News & content:**
- **Reddit** — story source. `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`. Used by scraper (PRAW or keyless).
- **NewsAPI** — `NEWSAPI_KEY`, `bot/config.py` → `NewsAPIConfig`.
- **RSS** — configurable feeds in `bot/config.py` → `RSSConfig.feeds` (Tom's Hardware, The Verge, Ars, Eurogamer, etc.).
- **Giant Bomb** — `GIANTBOMB_API_KEY`, `bot/config.py` → `GiantBombConfig`.

**Commerce:**
- **Amazon Product Advertising API (PA-API 5)** — affiliate links and product images. `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`, `AMAZON_REGION`/`AMAZON_MARKETPLACE`. Used in `bot/amazon_linker.py`; product images can be used as cover/alternates in `bot/image_fetcher.py`.

**Notifications & deploy:**
- **Discord** — webhook for pipeline success/failure; `DISCORD_WEBHOOK_URL`.
- **Build hook** — optional `BUILD_HOOK_URL` (e.g. Netlify/CF Pages) to trigger deploy after publish.

## Image workflow (Pexels/Unsplash) — where it breaks

**Where image search terms are generated:**

1. **New articles (scheduler pipeline)**  
   - `bot/ai_writer.py` asks the LLM for a JSON block that includes `image_search_queries` (2–4 phrases). The writer returns a dict with top-level `image_search_queries` (see `ai_writer.py` lines 70–74, 215, 357).  
   - The draft passed to `bot/image_fetcher.py` → `fetch_images(draft)` uses `draft.get("image_search_queries")`.  
   - **Fallback when missing or empty:** `[title] + (draft.get("amazon_search_queries") or [])[:2]` (single title string plus up to two Amazon queries). So if the model omits or empties `image_search_queries`, every article falls back to title + product queries, which then get heavily normalized (see below).

2. **Backfill (existing posts)**  
   - `bot/generate_fix_list.py` builds a fix list: one or more batched AI calls with slug/title/excerpt per post; the model returns JSON mapping each slug to `image_search_queries` (2–4 phrases). Written to `bot/.tmp/fix-list.json`.  
   - `bot/backfill_content.py` → `load_fix_list()` reads `bot/.tmp/fix-list.json`. When run with `--images-only`, `backfill_cover_images()` injects `draft["image_search_queries"]` from the fix list into the draft before calling `fetch_images(draft, use_pexels=True)`. So for backfill, search terms are AI-generated per post from title/excerpt, then used for Pexels search.

**How Pexels/Unsplash are called:**

- **Entry point:** `bot/image_fetcher.py` → `fetch_images(draft, use_pexels=False|True)`.
  - `use_pexels=False` (new posts): use Unsplash if `config.unsplash.access_key` set; else no API search.
  - `use_pexels=True` (backfill): use Pexels if `config.pexels.api_key` set; else no API search.
- **Query loop:**  
  `queries = draft.get("image_search_queries") or [title] + (draft.get("amazon_search_queries") or [])[:2]`.  
  For each query (until ≥4 images or queries exhausted):
  - Query is cleaned by `_clean_query_for_images(query, primary_topic)` (see below).
  - Either `search_pexels(clean_query, 3)` or `search_unsplash(clean_query, 3)` is called.
  - Results are filtered: exclude URLs whose base (without query string) is in `recent_cover_bases` (cover images from posts in last `IMAGE_REUSE_LOOKBACK_DAYS`, default 7) and deduplicated into `all_images`.
- **API keys:**  
  - Unsplash: `config.unsplash.access_key` from `UNSPLASH_ACCESS_KEY` (`bot/config.py`).  
  - Pexels: `config.pexels.api_key` from `PEXELS_API_KEY` (`bot/config.py`).  
  If the key is missing, Unsplash path logs "No Unsplash API key — using tag-hierarchy stock images" and no search is performed; Pexels path returns no results.

**How results are chosen per article:**

- **Order of sources:**  
  1. Query-based search (Pexels or Unsplash) using the cleaned queries above.  
  2. Amazon product images from `draft["frontmatter"]["amazonProducts"]` (topic-sorted, skip recent covers).  
  3. If fewer than 2 images, fallback to **stock pool**: `_get_pool_for_primary_topic(primary_topic, stock)` then `_get_pool_for_tags(tags, stock)` then `stock["default"]`. Stock data is in `bot/stock_images.json` (tag-hierarchy: Hardware/Graphics Cards, CPU, Console, etc.) — all curated Unsplash URLs.  
- **Selection from pool:** `_pick_least_recently_used(pool, used, count=4, exclude_bases=recent_cover_bases)`. Prefer images not in `used` (from `bot/used_images.json`, last 50 URLs); then exclude bases in `recent_cover_bases`; if pool exhausted, reuse least-recently used.  
- **Cover and alternates:** First selected image → `coverImage`; next up to 3 → `images` array. These are written to frontmatter by `fetch_images` and later to `.md` by `bot/publisher.py`.  
- **Query cleaning (cause of repetition and irrelevance):**  
  `_clean_query_for_images(query, primary_topic)` in `bot/image_fetcher.py` strips product tokens (e.g. RTX/RX/GTX model numbers) then applies **keyword → single replacement** mappings (e.g. "nvidia" → "graphics card computer", "gpu" → "graphics card gaming", "playstation" → "gaming console controller"). If no keyword matches, it uses **primary_topic** to force a single phrase: e.g. `gpu` → "graphics card gaming", `cpu` → "processor chip technology", `console` → "gaming console controller". So many different titles/queries collapse to the same search phrase and hence the same small set of API results or the same stock pool, producing repeated or generic images across articles.

**Summary of broken behaviour:**  
Same image reused: (1) fallback to title + amazon queries when AI omits `image_search_queries`, (2) aggressive query cleaning mapping many topics to one phrase, (3) small stock pool and "least recently used" within that pool. Images irrelevant to content: (1) title/excerpt used as fallback is often generic or product-heavy and gets normalized away, (2) stock pool is tag-based, not article-specific, (3) backfill only gets article-specific terms if `generate_fix_list.py` is run and `backfill_content.py --images-only` uses the resulting fix list.

## Data Storage

**Databases:**
- SQLite — `bot/seen_posts.db` (deduplication of seen stories). Path from `config.bot.db_path`.

**File storage:**
- Markdown files: `src/blog/posts/*.md` (source of truth for posts).
- Generated: `public/blog-posts.json` (built by `scripts/build-blog.js` from markdown).
- Bot state: `bot/used_images.json` (last 50 used image URLs), `bot/.tmp/fix-list.json` (fix list), `bot/.tmp/drafts/` (partial drafts), `bot/logs/` (scheduler logs).

**Caching:**
- No separate cache service. Recent cover URLs derived from `blog-posts.json` and `used_images.json` for anti-reuse.

## Authentication & Identity

**Auth provider:** None for site users.  
**API auth:** API keys only (env vars in `bot/.env`): Unsplash Client-ID, Pexels API key, OpenRouter/OpenAI/Groq, Reddit, NewsAPI, GiantBomb, Amazon PA-API, Discord webhook URL.

## Monitoring & Observability

**Error tracking:** Not detected (no Sentry etc.).  
**Logs:** `bot/logs/scheduler.log` (rotating); script-level logging to stdout/stderr.

## CI/CD & Deployment

**Hosting:** Static site (e.g. Netlify/Cloudflare Pages); build runs `npm run build` (build:blog + vite build).  
**CI pipeline:** Not detected in repo.  
**Publish:** `bot/publisher.py` writes `.md`, commits, pushes to `config.git` remote/branch; optional `BUILD_HOOK_URL` ping.

## Environment Configuration

**Required env vars (bot):**  
At least one AI provider (OpenRouter/OpenAI/Ollama). For full pipeline: Reddit or RSS, optionally NewsAPI/GiantBomb; Amazon for affiliate; **UNSPLASH_ACCESS_KEY** for new-post images; **PEXELS_API_KEY** for backfill images; Groq optional for hero validation. REPO_PATH, GIT_REMOTE, GIT_BRANCH; DISCORD_WEBHOOK_URL optional.

**Secrets location:** `bot/.env` (from `bot/.env.example`); not committed. Root `.env` exists but bot loads from `bot/.env`.

## Webhooks & Callbacks

**Incoming:** None documented.  
**Outgoing:** Discord webhook (pipeline status); optional build hook URL (deploy trigger).

---

*Integration audit: 2026-03-01*
