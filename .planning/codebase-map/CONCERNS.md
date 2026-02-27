# Codebase Concerns

**Analysis Date:** 2026-02-27

## Security Concerns

**CRITICAL — Live API key committed to `bot/.env`:**
- Issue: `bot/.env` contains a real OpenRouter API key (`sk-or-v1-...`). While `.gitignore` lists `bot/.env` and `.env`, the project is **not currently a git repository**. If git is initialised carelessly (e.g. `git add -A` before verifying `.gitignore` takes effect), secrets will be committed.
- Files: `bot/.env` (line 10), `.gitignore` (lines 27–28)
- Impact: Leaked API key allows third parties to make AI calls at the owner's expense. The key is an OpenRouter key with potential billing.
- Fix approach: Rotate the exposed key immediately. Add a pre-commit hook or use git-secrets to block credential patterns. Consider using a secrets manager or OS-level env vars instead of a dotfile.

**`server.js` — Wide-open CORS:**
- Issue: `app.use(cors())` on line 17 allows requests from any origin. The server has write endpoints (`POST /api/posts`, `DELETE /api/posts/:slug`) that can create/delete blog posts and trigger builds.
- Files: `server.js` (line 17)
- Impact: Any website can make cross-origin requests to create or delete posts if the server is running.
- Fix approach: Restrict CORS to `localhost` and the production domain: `cors({ origin: ['http://localhost:5173', 'https://ctrlaltstock.com'] })`.

**`server.js` — No authentication:**
- Issue: All API endpoints are unauthenticated. Anyone who can reach the server can create, list, or delete blog posts.
- Files: `server.js` (lines 29, 93, 172, 213)
- Impact: Destructive actions (delete all posts) with zero access control.
- Fix approach: Add a simple API key or token auth middleware. Even a shared secret in an env var checked via `Authorization` header is better than nothing.

**`server.js` — Path traversal via slug:**
- Issue: The `:slug` parameter in `GET /api/posts/:slug` and `DELETE /api/posts/:slug` is used directly in `path.join(POSTS_DIR, \`${slug}.md\`)` without sanitisation. A crafted slug like `../../etc/passwd` would resolve outside the posts directory.
- Files: `server.js` (lines 175, 216)
- Impact: Arbitrary file read (GET) or delete (DELETE) on the host filesystem.
- Fix approach: Validate slug against `/^[a-z0-9-]+$/` and reject anything containing path separators or `..`.

**`server.js` — Shell command injection surface:**
- Issue: `exec('npm run build:blog')` is called after post create/delete. While the command itself is static (not user-influenced), using `child_process.exec` with `shell: true` (implicit) is a risky pattern. If any future refactor interpolates user input into the command, it becomes a direct shell injection.
- Files: `server.js` (lines 8, 72, 225)
- Impact: Low risk today, high risk if modified carelessly.
- Fix approach: Switch to `execFile` or `spawn` with explicit args array (no shell).

**`server.js` — No rate limiting:**
- Issue: No rate limiting on any endpoint. A malicious actor could spam `POST /api/posts` to fill disk or trigger unlimited `npm run build:blog` processes.
- Files: `server.js`
- Impact: Denial of service, disk exhaustion, CPU exhaustion from concurrent builds.
- Fix approach: Add `express-rate-limit` middleware.

**Amazon scraping with browser-like headers:**
- Issue: `amazon_linker.py` and `backfill_content.py` fetch Amazon search pages with spoofed browser `User-Agent` headers to scrape product images. This violates Amazon's ToS and risks IP bans.
- Files: `bot/amazon_linker.py` (lines 64–89), `bot/backfill_content.py`
- Impact: Amazon may block the server's IP. If running from a home connection, this blocks all Amazon access from that IP.
- Fix approach: Use the PA-API exclusively for image retrieval, or cache images locally. Accept empty images gracefully when PA-API is not configured.

## Technical Debt

**Duplicate `fix-markdown.js` files:**
- Issue: Identical logic exists in two files with different module systems — `fix-markdown.js` (root, CommonJS `require`) and `src/fix-markdown.js` (ESM `import`). Neither is referenced by `package.json` scripts.
- Files: `fix-markdown.js`, `src/fix-markdown.js`
- Impact: Confusion over which to use. Changes to one are not reflected in the other. Both appear to be one-off migration scripts that should have been deleted.
- Fix approach: Delete both files. If the functionality is still needed, consolidate into one script under `scripts/` and add a `package.json` script entry.

**Triple-source product data:**
- Issue: Product data exists in three independent locations with different schemas, different products, and no synchronisation:
  1. `src/blog/data/products.ts` — 9 hardcoded products (RTX 4090, PS5, etc.), TypeScript, uses `Product` type with `id`, `inStock`, etc.
  2. `src/blog/data/products.json` — Only 2 products (RTX 4090, RX 7900 XTX), JSON subset, used by frontend components.
  3. `public/affiliate-products.json` — 30+ products with affiliate tags (RTX 5090, 5080, etc.), different schema (`name` not `title`, no `id` field), used by bot's `amazon_linker.py`.
- Files: `src/blog/data/products.ts`, `src/blog/data/products.json`, `public/affiliate-products.json`
- Impact: Products shown on the frontend don't match what the bot embeds in articles. Updating prices requires editing multiple files. The `.ts` file has stale prices (2023-era).
- Fix approach: Make `public/affiliate-products.json` the single source of truth. Generate the TypeScript types and any JSON subsets from it via a build script.

**`productData` referenced but no `productData.ts` file:**
- Issue: Seven frontend files import or reference `productData`, but `src/blog/data/productData.ts` does not exist. Components reference both `products.ts` and `productData` inconsistently.
- Files: `src/server/api.ts`, `src/blog/BlogPost.tsx`, `src/blog/components/BlockRenderer.tsx`, `src/blog/components/AdvancedBlockEditor.tsx`, `src/blog/components/BlockEditor.tsx`, `src/blog/components/ProductManager.tsx`, `src/blog/components/ProductSelector.tsx`
- Impact: Possible build errors or runtime failures if the import path isn't aliased or re-exported.
- Fix approach: Audit all `productData` imports. Consolidate to a single canonical export.

**Empty `blog-categories.json`:**
- Issue: `public/blog-categories.json` has an empty `categories` object. The AI editor (`ai_editor.py`) loads this to build category-based internal links, but falls back to inferring categories from tags.
- Files: `public/blog-categories.json`, `bot/ai_editor.py` (lines 70–79)
- Impact: Internal linking quality is degraded — the editor cannot match posts by hierarchical category, only by flat tags.
- Fix approach: Populate categories via a build script that infers from tags, or add category metadata to frontmatter and generate from there.

**Fallback posts with hardcoded 2023 dates:**
- Issue: `server.js` contains hardcoded fallback posts with `publishedDate: '2023-06-15'` and `'2023-10-20'`. These are returned when no `.md` file exists for a slug.
- Files: `server.js` (lines 133–164)
- Impact: Stale content. Misleading dates in the API response.
- Fix approach: Remove fallback posts entirely — they serve no purpose once real posts exist (there are 11 posts). If fallbacks are needed, generate them dynamically.

**Duplicate `sys` import in `publisher.py`:**
- Issue: `sys` is imported twice (lines 16 and 31).
- Files: `bot/publisher.py` (lines 16, 31)
- Impact: No runtime error but signals sloppy maintenance.
- Fix approach: Remove the duplicate import on line 31.

## Reliability Risks

**AI pipeline — 3 LLM calls per article, each can fail:**
- Issue: Each article requires calls to writer (1), refiner (1), and editor (1) — three AI calls, not two as some comments claim. Each has up to 3 retries with exponential backoff. A single article can make up to 9 API calls in worst case. With `ARTICLES_PER_RUN=3`, that's up to 27 API calls per run.
- Files: `bot/ai_writer.py` (lines 77–98), `bot/ai_refiner.py` (lines 74–107), `bot/ai_editor.py` (lines 190–203)
- Impact: High failure rate on free-tier models. Pipeline can take 10+ minutes per article. If OpenRouter is down, fallback is Ollama (which may not be running).
- Fix approach: Add circuit-breaker pattern. Track cumulative failure rate and skip runs when API is consistently failing. Log latency per call for monitoring.

**`is_seen` does a full table scan:**
- Issue: `scraper.py` line 82 fetches ALL titles from the `seen_posts` table on every dedup check to do normalised string comparison. This is O(n) per candidate story.
- Files: `bot/scraper.py` (lines 71–87)
- Impact: As the database grows (hundreds/thousands of seen posts), each scraping run slows linearly. With 11 subreddits × 25 posts + RSS feeds, `is_seen` is called hundreds of times per run.
- Fix approach: Store a normalised title column (`norm_title`) in the database and index it. Use SQL `WHERE norm_title = ?` instead of Python-side comparison.

**No process locking — concurrent runs can corrupt data:**
- Issue: Nothing prevents two scheduler instances from running simultaneously (e.g. cron fires while a previous run is still executing). Both would read/write `seen_posts.db`, `used_images.json`, `blog-posts.json`, and git operations concurrently.
- Files: `bot/scheduler.py`, `bot/scraper.py` (SQLite), `bot/image_fetcher.py` (JSON files)
- Impact: Duplicate articles published, corrupt JSON files, git merge conflicts.
- Fix approach: Add a PID lockfile at the start of `run_pipeline()`. Check and bail if another instance is running.

**`git add -A` stages everything:**
- Issue: `publisher.py` line 105 runs `repo.git.add(A=True)` which stages ALL changes in the repo, not just the new post. If there are uncommitted manual changes, debug files, or leftover temp files, they all get committed and pushed automatically.
- Files: `bot/publisher.py` (line 105)
- Impact: Unintended files pushed to remote. Potential secret leakage if `.env` was accidentally unstaged by `.gitignore` changes.
- Fix approach: Stage only specific paths: `repo.git.add(['src/blog/posts/', 'public/blog-posts.json'])`.

**Daemon mode vs cron — no health monitoring:**
- Issue: When using `--daemon` mode, the process loops with `schedule.every(30).minutes`. If the process crashes (OOM, unhandled exception in `schedule`), there's no supervisor to restart it. No health check endpoint. No heartbeat.
- Files: `bot/scheduler.py` (lines 273–281)
- Impact: Silent failures — bot stops publishing and nobody notices unless they check Discord or logs manually.
- Fix approach: Use OS-level cron (as recommended in comments) + a monitoring check. Add a Discord ping if no article was published in 24 hours.

**`exec` callback in `server.js` swallows errors:**
- Issue: `exec('npm run build:blog', callback)` in the POST and DELETE handlers runs asynchronously after the response is already sent. If the build fails, the error is only logged — the client receives a success response.
- Files: `server.js` (lines 72–78, 225–231)
- Impact: Client thinks the post was saved/deleted successfully, but `blog-posts.json` is stale. Frontend shows outdated data.
- Fix approach: Use `execSync` or `await` the build and return an appropriate status code. Or make it truly async with a queue.

## Data Integrity Concerns

**JSON file writes are not atomic:**
- Issue: `used_images.json`, `stock_images.json`, and `affiliate-products.json` are read and written directly. If the process crashes mid-write, the file is corrupted (truncated JSON).
- Files: `bot/image_fetcher.py` (lines 97–104), `scripts/build-blog.js` (line 211)
- Impact: Next pipeline run fails to parse the JSON file and may crash or produce unexpected output.
- Fix approach: Write to a temp file, then atomically rename (`os.replace` on Python, `fs.rename` on Node).

**SQLite database has no WAL mode or timeout:**
- Issue: `scraper.py` uses default SQLite settings. Default journal mode is `delete`, which has poor concurrent-read performance and no crash recovery beyond rollback journal.
- Files: `bot/scraper.py` (line 49)
- Impact: Slow under load. Risk of corruption if the process is killed during a write.
- Fix approach: Enable WAL mode (`PRAGMA journal_mode=WAL`) and set a busy timeout (`PRAGMA busy_timeout=5000`).

**`blog-posts.json` in `public/` is a build artifact AND source of truth:**
- Issue: `public/blog-posts.json` is regenerated by `scripts/build-blog.js` from markdown files. But it's also read by the bot (`scraper.py`, `ai_editor.py`, `image_fetcher.py`) as the source of truth for existing posts. If the build script hasn't run after a new post is published, the bot operates on stale data.
- Files: `public/blog-posts.json`, `scripts/build-blog.js`, `bot/scraper.py` (line 107), `bot/ai_editor.py` (line 84), `bot/image_fetcher.py` (line 109)
- Impact: Duplicate articles (scraper doesn't see recent posts), broken internal linking, reused cover images.
- Fix approach: Always run `npm run build:blog` at the start of the pipeline, not just after publishing.

## Cost Risks

**AI API usage without spend tracking:**
- Issue: No budget cap or spend tracking. Using OpenRouter free tier currently, but if the free model is unavailable, fallback goes to Ollama (local, free) or OpenAI (paid — GPT-4o at ~$5-15/1K output tokens). With 3 articles/run and 3 AI calls/article, a single run could cost $1-5 if routed to GPT-4o.
- Files: `bot/ai_writer.py` (lines 135–158), `bot/config.py` (line 29)
- Impact: Unexpected bills if `AI_PROVIDER=openai` is set or if OpenRouter routes to a paid model. No alerts on spending thresholds.
- Fix approach: Add a per-run cost estimate. Track cumulative spend in a local file. Set a daily/monthly budget cap. Log model name and token counts per call.

**OpenRouter free-tier rate limits:**
- Issue: Free models have limits of ~20 req/min and ~200/day. With 3 articles × 3 calls × 3 retries = up to 27 calls per run, a single run can exhaust 13% of the daily limit. Running every 30 minutes (48 runs/day) would require ~1,296 calls — 6× the daily limit.
- Files: `bot/config.py` (line 24 comment), `bot/scheduler.py`
- Impact: Most runs will fail due to rate limiting. Pipeline burns time on retries before failing.
- Fix approach: Track remaining rate limit from response headers. Skip runs when near the limit. Reduce `ARTICLES_PER_RUN` to 1 for free tier.

**Amazon PA-API costs:**
- Issue: PA-API is free but throttled (1 request/second with burst). The bot supplements with HTML scraping when PA-API is not configured, which risks IP bans.
- Files: `bot/amazon_linker.py` (lines 109–181)
- Impact: Product linking may fail silently, resulting in articles with broken/empty product sections.
- Fix approach: Gracefully degrade — if neither PA-API nor scraping works, use curated products only. Don't attempt scraping.

## Missing Infrastructure

**Zero test coverage:**
- Issue: No test files exist anywhere in the project — no `*.test.*`, no `*.spec.*`, no test directories, no test framework configured.
- Files: (none)
- Impact: Every change is deployed with zero automated validation. Regressions are only caught by manual review or production failures.
- Fix approach: Add Vitest for the frontend (it's already a Vite project). Add pytest for the bot. Start with critical paths: `scraper.py` dedup logic, `build-blog.js` markdown parsing, `server.js` slug validation.

**No CI/CD pipeline:**
- Issue: No GitHub Actions, no GitLab CI, no deployment pipeline. The bot does `git push` directly to main. The frontend is presumably deployed via Cloudflare Pages/Netlify build hook on push.
- Files: (none — no `.github/workflows/`, no `netlify.toml`, no `wrangler.toml`)
- Impact: No linting, no type checking, no build verification before deployment. A broken commit goes straight to production.
- Fix approach: Add a minimal GitHub Actions workflow: lint, typecheck, build. Gate deploys on passing CI.

**No monitoring or alerting:**
- Issue: The only notification mechanism is a Discord webhook (`publisher.py`), and it's only triggered on individual article success/failure. No monitoring for: bot health, API costs, disk usage, database growth, or frontend uptime.
- Files: `bot/publisher.py` (lines 138–162)
- Impact: Silent failures accumulate. Database grows unbounded. Disk fills up with logs.
- Fix approach: Add a daily summary Discord notification (articles published, failures, DB size). Add uptime monitoring for the frontend. Add log rotation for `bot/logs/`.

**No log rotation:**
- Issue: Bot writes to multiple log files (`scheduler.log`, `scraper.log`, `publish.log`, `ai_refiner.log`, `ai_editor.log`, `backfill.log`, `rejected_candidates.jsonl`). None have rotation configured.
- Files: `bot/scheduler.py` (line 50), `bot/scraper.py` (line 42), `bot/publisher.py` (line 43)
- Impact: Log files grow unbounded. On a long-running deployment, disk fills up.
- Fix approach: Use Python's `RotatingFileHandler` with a max size (e.g. 10 MB) and backup count.

## Scalability Limitations

**Full table scan in `is_seen` — O(n) per candidate:**
- Issue: As documented above, the dedup check in `scraper.py` fetches ALL rows to compare normalised titles in Python.
- Files: `bot/scraper.py` (line 82)
- Impact: At 1000 seen posts, each run processes ~300 candidates × 1000 comparisons = 300K string operations. Feasible but slow. At 10K posts, it becomes a real bottleneck.
- Fix approach: Add `norm_title TEXT` column with index. Use SQL comparison.

**`blog-posts.json` grows linearly with post count:**
- Issue: The entire blog is served from a single `blog-posts.json` file that contains full article content (not just metadata). With 11 posts it's manageable, but at 100+ posts (bot publishes ~3/day = ~90/month), this file will be several MB.
- Files: `public/blog-posts.json`, `scripts/build-blog.js` (line 174 includes full `content`)
- Impact: Slow page loads on the blog listing page (entire blog loaded in one fetch). High memory usage in the frontend.
- Fix approach: Split into index (metadata only) and individual post files. Implement pagination.

**Single-threaded bot pipeline:**
- Issue: Articles are processed sequentially. Each article takes 3 AI calls (30–90 seconds each) + image fetching + Amazon lookup. A 3-article run can take 10–15 minutes.
- Files: `bot/scheduler.py` (lines 227–229)
- Impact: Long run times increase the chance of overlapping with the next cron invocation. Slow feedback loop.
- Fix approach: Acceptable for now. If scaling beyond 3 articles/run, consider async pipeline or parallel processing for independent steps (images + Amazon can run concurrently).

## Dependencies at Risk

**`react-beautiful-dnd` — archived/unmaintained:**
- Risk: This library was archived by Atlassian and is no longer maintained. No React 19 support planned.
- Files: `package.json` (line 17)
- Impact: Will break on React upgrade. Security patches will not be provided.
- Migration plan: Replace with `@hello-pangea/dnd` (maintained fork, drop-in compatible) or `dnd-kit`.

**`@types/react-beautiful-dnd` in `dependencies` not `devDependencies`:**
- Risk: Type packages should be dev dependencies. Having them in `dependencies` adds unnecessary weight to production builds.
- Files: `package.json` (line 16)
- Impact: Bloated `node_modules` in production.
- Fix approach: Move all `@types/*` packages to `devDependencies`.

**No Python lockfile:**
- Risk: `bot/requirements.txt` pins some versions (e.g. `praw==7.7.1`) but uses ranges for others (`openai>=1.35.0`, `Pillow>=11.0.0`, `lxml>=5.2.2`). No `requirements.lock` or `poetry.lock` exists.
- Files: `bot/requirements.txt`
- Impact: Different installs may get different dependency versions. A breaking update to `openai` or `httpx` could silently break the bot.
- Fix approach: Pin all versions. Use `pip freeze > requirements.lock` or switch to `poetry`/`uv` for proper dependency resolution.

**`requests` listed but unused:**
- Risk: `requests==2.32.3` is in `requirements.txt` but the bot uses `httpx` exclusively for HTTP calls.
- Files: `bot/requirements.txt` (line 11)
- Impact: Unnecessary dependency. Increases attack surface and install time.
- Fix approach: Remove `requests` from requirements.

**`Jinja2` listed but unused:**
- Risk: `Jinja2>=3.1.4` is in `requirements.txt` but no bot script imports or uses it.
- Files: `bot/requirements.txt` (line 31)
- Impact: Unnecessary dependency.
- Fix approach: Remove unless there's a planned use.

## Test Coverage Gaps

**No tests exist — entire codebase is untested:**
- What's not tested: Everything. Critical paths include:
  - `scraper.py` dedup/scoring logic — wrong scoring means irrelevant articles
  - `build-blog.js` markdown parsing — broken parsing means broken blog
  - `server.js` POST/DELETE — broken validation means data loss or security issues
  - `ai_writer.py` metadata extraction — broken parsing means missing tags/slugs
  - `publisher.py` git operations — broken git means articles never go live
- Files: All source files
- Risk: Any change can break critical functionality with zero automated detection.
- Priority: **High** — start with `scraper.py` scoring, `build-blog.js` parsing, and `server.js` input validation.

---

*Concerns audit: 2026-02-27*
