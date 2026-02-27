# Architecture

**Analysis Date:** 2026-02-27

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTENT SOURCES                              │
│  Reddit (PRAW / JSON)         RSS Feeds (7 sources)                 │
│  r/hardware, r/buildapc,      Tom's HW, Ars Technica, WCCFTech,   │
│  r/nvidia, r/Amd, etc.        The Verge, HotHardware, etc.        │
└─────────────┬───────────────────────────┬───────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BOT PIPELINE (Python)                           │
│  bot/scheduler.py orchestrates:                                     │
│                                                                     │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌───────────────┐   │
│  │ scraper  │→ │ ai_writer │→ │ ai_refiner │→ │  ai_editor    │   │
│  │   .py    │  │   .py     │  │    .py     │  │    .py        │   │
│  └──────────┘  └───────────┘  └────────────┘  └───────┬───────┘   │
│       ↑                                                │           │
│  SQLite dedup                                          ▼           │
│  (seen_posts.db)      ┌────────────────┐  ┌────────────────────┐  │
│                       │ amazon_linker  │← │  image_fetcher     │  │
│                       │     .py        │  │      .py           │  │
│                       └───────┬────────┘  └────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│                       ┌────────────────┐                           │
│                       │  publisher.py  │                           │
│                       └───────┬────────┘                           │
│                               │                                    │
└───────────────────────────────┼────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
  src/blog/posts/*.md    npm run build:blog     git push + webhook
           │                    │
           │                    ▼
           │          public/blog-posts.json
           │          public/blog-categories.json
           │                    │
           └────────┬───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER (Node.js)                         │
│  server.js — port 3001                                              │
│  POST /api/posts  │  GET /api/posts  │  GET /api/posts/:slug        │
│  DELETE /api/posts/:slug                                            │
│  (reads/writes src/blog/posts/*.md via gray-matter)                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React SPA)                            │
│  Vite + React 18 + TypeScript + Tailwind CSS                        │
│  react-router-dom (flat routes, no nesting)                         │
│                                                                     │
│  /              → App.tsx (landing page, hero, blog preview)        │
│  /blog          → BlogHome.tsx (listing, search, tag filter)        │
│  /blog/:slug    → BlogPost.tsx (article reader)                     │
│  /blog/editor   → LocalEditor.tsx (drag-and-drop block editor)      │
│  /blog-editor   → AdvancedBlogEditor.tsx (rich block editor)        │
│  /about         → About.tsx                                         │
│  /terms-of-service, /privacy-policy → legal pages                   │
│                                                                     │
│  Data fetching: blogUtils.ts (API → static JSON fallback)           │
└─────────────────────────────────────────────────────────────────────┘
```

## Pattern Overview

**Overall:** Multi-system content pipeline + SPA reader

The project is a content-generation platform with three distinct subsystems:
1. A **Python automation pipeline** (bot) that discovers, writes, edits, and publishes blog posts
2. A **Node.js Express API** (server.js) for CRUD on markdown posts
3. A **React SPA** (src/) that reads and displays blog content

These subsystems are loosely coupled through shared file-system artifacts: markdown files in `src/blog/posts/` and JSON data files in `public/`.

**Key Characteristics:**
- File-system as the integration layer — markdown files and JSON are the shared contract
- Dual data path: frontend reads from Express API (dev) or static JSON (production/fallback)
- Bot pipeline is fully autonomous — scrape, generate, publish, git push — runs on a 30-minute cron
- No shared runtime between Python bot and Node.js/React — only shared files

## Data Flow: Content Pipeline (Reddit → Published Blog)

**End-to-end content generation (per article):**

1. **Scrape** (`bot/scraper.py`): Pulls stories from Reddit (PRAW or keyless JSON API) and RSS feeds (7 sources). Scores by relevance keywords, deduplicates against SQLite (`bot/seen_posts.db`) and existing `public/blog-posts.json`. Classifies topic (GPU/CPU/console/deal/review/news), theme (pc_hardware/console/tv/listicle), and personal angle. Alternates personal vs news stories for diversity. Returns the highest-ranked `StoryBrief` dict.

2. **Write** (`bot/ai_writer.py`): Sends story brief to AI (OpenRouter → OpenAI → Ollama fallback chain). System prompt enforces CtrlAltStock brand voice, UK English, GBP pricing, 800–1200 word articles with structured H1/H2 sections. Extracts trailing JSON metadata block (tags, slug, excerpt, amazon_search_queries). Retries up to 3x on short/empty output.

3. **Refine** (`bot/ai_refiner.py`): Second AI pass to enrich draft with concrete details (product names, model numbers, GBP prices). Enforces minimum 900 words. Does not change structure — only adds relevant information. Retries up to 3x.

4. **Edit** (`bot/ai_editor.py`): Editorial AI pass for SEO, internal linking (injects `ctrlaltstock.com/blog/SLUG` links to existing posts), temporal accuracy, and GBP pricing enforcement. Loads existing posts from `public/blog-posts.json` and `public/blog-categories.json` for link targeting. Retries up to 3x, falls back to pre-editor content if all attempts are too short.

5. **Amazon Links** (`bot/amazon_linker.py`): Matches article to curated product list (`public/affiliate-products.json`) by tag/keyword scoring with topic bonuses. Supplements with PA-API 5.0 search or Amazon search URL fallback. Fetches product images via HTML scraping. Embeds up to 3 `amazonProducts` in frontmatter.

6. **Images** (`bot/image_fetcher.py`): Selects cover image + article images. Prefers Amazon product images (topic-matched), then Unsplash API, then curated stock images from `bot/stock_images.json` (aligned to tag hierarchy). Anti-reuse: tracks recently used URLs in `bot/used_images.json` and excludes covers from posts published in last 7 days.

7. **Publish** (`bot/publisher.py`): Assembles frontmatter + content into `.md` file via `python-frontmatter`. Writes to `src/blog/posts/<slug>.md`. Runs `npm run build:blog` to regenerate `public/blog-posts.json`. Git add/commit/push. Triggers optional build webhook (Netlify/CF Pages). Sends Discord notification.

**Scheduling:**
- `bot/scheduler.py` orchestrates the full pipeline. Gets top 3 stories per run, processes each sequentially.
- `bot/run-cron.ps1` is a Windows Task Scheduler wrapper that runs `python bot/scheduler.py --once` every 30 minutes.
- On crash, partial drafts are saved to `bot/.tmp/drafts/` and auto-resumed on next run.

## Frontend Architecture

### Routing

Flat route table in `src/main.tsx` using `createBrowserRouter` (React Router v6). No nested routes or layout routes — `Layout` component is applied per-page by wrapping `<Layout>` in each page component (except `App.tsx` which has its own full-page layout).

**Route map:**
| Path | Component | File |
|------|-----------|------|
| `/` | `App` | `src/App.tsx` |
| `/about` | `About` | `src/components/About.tsx` |
| `/terms-of-service` | `TermsOfService` | `src/components/TermsOfService.tsx` |
| `/privacy-policy` | `PrivacyPolicy` | `src/Privacy.tsx` |
| `/blog` | `BlogHome` | `src/blog/BlogHome.tsx` |
| `/blog/editor` | `LocalEditor` | `src/blog/LocalEditor.tsx` |
| `/blog-editor` | `AdvancedBlogEditor` | `src/blog/AdvancedBlogEditor.tsx` |
| `/blog-editor/:slug` | `AdvancedBlogEditor` | `src/blog/AdvancedBlogEditor.tsx` |
| `/blog/:slug` | `BlogPost` | `src/blog/BlogPost.tsx` |

### State Management

No global state library. Each page manages its own state via `useState`/`useEffect`.

- `BlogHome` (`src/blog/BlogHome.tsx`): Manages posts list, tag filters, search term, pagination. Uses URL query params for tag filtering (`?tag=GPU`). Has a synchronous cache (`getAllPostsSync`) for instant display while async fetch completes.
- `BlogPost` (`src/blog/BlogPost.tsx`): Fetches single post by slug, related products (via tag matching against `public/affiliate-products.json`), and related posts (topic overlap scoring).
- `App.tsx`: Fetches all posts for the blog preview slideshow on the landing page.

### Component Hierarchy

```
main.tsx
├── RouterProvider (createBrowserRouter)
│   ├── App.tsx (landing page — no Layout wrapper)
│   │   ├── TunnelAnimation (Three.js WebGL background)
│   │   ├── InfiniteScroll (product tracking carousel)
│   │   ├── BlogFeaturedSlideshow (latest posts slideshow)
│   │   └── Footer (inline)
│   │
│   ├── Layout.tsx (shared shell for sub-pages)
│   │   ├── Header (fixed glassmorphic navbar)
│   │   ├── {children} (page content)
│   │   └── Footer
│   │
│   ├── BlogHome.tsx (wrapped in Layout)
│   │   ├── BlogFeaturedSlideshow (top 8 featured)
│   │   ├── Tag filter bar (tagHierarchy-driven)
│   │   ├── Search input
│   │   ├── Post cards grid (paginated, 6 per page)
│   │   │   └── MarkdownRenderer (for excerpts)
│   │   └── Pagination controls
│   │
│   ├── BlogPost.tsx (wrapped in Layout)
│   │   ├── Tag links
│   │   ├── Author/date header
│   │   ├── Cover image
│   │   ├── BlockRenderer (primary) OR MarkdownRenderer (fallback)
│   │   │   └── MarkdownRenderer (inside each text block)
│   │   │   └── FeaturedProductCallout (inline product cards)
│   │   ├── ArticleDiscordCTA
│   │   ├── Share buttons (Twitter, Facebook, LinkedIn, Copy)
│   │   ├── AmazonProductGrid (from frontmatter.amazonProducts)
│   │   ├── RecommendedProductsSection (from affiliate-products.json)
│   │   └── Related posts grid (topic-scored)
│   │
│   ├── AdvancedBlogEditor.tsx (wrapped in Layout)
│   │   ├── AdvancedBlockEditor (WYSIWYG block editor)
│   │   └── BlockRenderer (preview mode)
│   │
│   └── LocalEditor.tsx (wrapped in Layout)
│       ├── Block editor (drag-and-drop via react-beautiful-dnd)
│       ├── ProductSelector
│       └── MarkdownRenderer (preview)
```

### Content Rendering

Two rendering strategies for blog posts:

1. **BlockRenderer** (`src/blog/components/BlockRenderer.tsx`): Primary renderer. Takes `contentBlocks[]` array and renders each block by type: `title`, `headline`, `text` (delegates to MarkdownRenderer), `image`, `product`, `excerpt`, `divider`, `snippet`. Used when `post.contentBlocks` is non-empty.

2. **MarkdownRenderer** (`src/blog/components/MarkdownRenderer.tsx`): Fallback for legacy posts. Uses `react-markdown` + `remark-gfm`. Also parses `<!-- featured-product: ... -->` HTML comments into `FeaturedProductCallout` inline product cards. Used inside BlockRenderer for text blocks, and as standalone fallback.

### Data Fetching Strategy

`src/blog/utils/blogUtils.ts` implements a dual-source pattern:

1. **Primary**: `fetch('http://localhost:3001/api/posts')` — Express API (development mode, server must be running)
2. **Fallback**: `fetch('/blog-posts.json')` — Static JSON in `public/` (production, or when API is down)

The module maintains a synchronous in-memory cache (`cachedPosts`, `cachedTags`) populated on first fetch, allowing `getAllPostsSync()` for instant renders before async data loads.

## API Surface (server.js)

Express server on port 3001, CORS enabled, 50MB JSON body limit.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/posts` | Save/create a blog post. Accepts `{post}` body with title, content, slug, tags, etc. Writes `src/blog/posts/<slug>.md` with gray-matter frontmatter. Triggers `npm run build:blog` to rebuild `public/blog-posts.json`. |
| `GET` | `/api/posts` | List all posts. Reads all `.md` files from `src/blog/posts/`, parses frontmatter with gray-matter, returns array. |
| `GET` | `/api/posts/:slug` | Get single post by slug. Reads `src/blog/posts/<slug>.md`, parses frontmatter. Falls back to hardcoded sample posts if file not found. |
| `DELETE` | `/api/posts/:slug` | Delete a post. Removes the `.md` file and triggers `npm run build:blog`. |

The server reads/writes directly to the source tree (`src/blog/posts/`), not `public/`. The `build:blog` script bridges them.

## Build Pipeline

### `scripts/build-blog.js`

Pre-build script (`npm run build:blog`) that converts markdown posts to static JSON:

- **Input**: All `.md` files in `src/blog/posts/`
- **Output**: `public/blog-posts.json`
- Parses frontmatter with gray-matter. Handles author objects, tag arrays, image arrays, recommendedProductIds, amazonProducts, relatedPostSlugs.
- Auto-generates `contentBlocks` from markdown headings when not present in frontmatter.
- Called by: `npm run build` (before Vite build), `server.js` (after POST/DELETE), `bot/publisher.py` (after writing new post).

### Vite Build

`npm run build` = `npm run build:blog && vite build`. Standard Vite + React + TypeScript pipeline with Tailwind CSS (via PostCSS).

## File/Data Flow: JSON as Integration Layer

```
bot/publisher.py
    │
    ▼
src/blog/posts/<slug>.md          ← Markdown + YAML frontmatter (source of truth)
    │
    │  npm run build:blog
    ▼
public/blog-posts.json            ← All posts as JSON array (derived, regenerated)
public/blog-categories.json       ← Slug → category path mapping
public/affiliate-products.json    ← Curated affiliate product list (manually maintained)
    │
    │  fetch() from frontend
    ▼
blogUtils.ts → BlogHome / BlogPost / App
```

**Key JSON files:**

| File | Purpose | Produced by | Consumed by |
|------|---------|-------------|-------------|
| `public/blog-posts.json` | All blog posts as JSON | `scripts/build-blog.js` | Frontend (`blogUtils.ts`), bot (`scraper.py`, `ai_editor.py`, `image_fetcher.py`) |
| `public/blog-categories.json` | Slug → category path mapping | Manual / bot | `ai_editor.py` (internal link targeting) |
| `public/affiliate-products.json` | Curated affiliate product list | Manual | Frontend (`productData.ts`), bot (`amazon_linker.py`) |
| `src/blog/data/products.json` | Legacy static product data | Manual | Frontend (`productData.ts`) |
| `src/blog/data/tagHierarchy.ts` | Tag groups and subcategories | Manual | Frontend (BlogHome tag filter, image_fetcher mapping) |
| `src/blog/data/stockImages.ts` | Stock image URLs by category | Manual | Frontend |
| `bot/seen_posts.db` | SQLite dedup database | `scraper.py` | `scraper.py` |
| `bot/used_images.json` | Recently used image URLs | `image_fetcher.py` | `image_fetcher.py` |
| `bot/stock_images.json` | Tag-aligned stock images | Manual | `image_fetcher.py` |

## Key Abstractions

### StoryBrief (bot)

Internal dict produced by `bot/scraper.py`, consumed by the pipeline. Contains `id`, `title`, `summary`, `source_url`, `source_type`, `raw_content`, `relevance_score`, `topic`, `theme`, `story_angle`, `personal_score`.

### Draft (bot)

Internal dict passed through the pipeline stages. Shape: `{slug, frontmatter: {...}, content: str, amazon_search_queries: [...], featured_product_keywords: [...]}`. Each stage mutates and returns the draft.

### BlogPost (frontend)

TypeScript interface at `src/types.ts`. Core shape: `{id, slug, title, excerpt, content, publishedDate, author, tags, readingTime, coverImage, contentBlocks, images, amazonProducts, featuredProductId, recommendedProductIds, autoGenerated, sourceUrl}`.

### ContentBlock (frontend)

Union type at `src/types.ts`. Block types: `title`, `headline`, `excerpt`, `divider`, `text`, `image`, `product`, `snippet`. Each has `id`, `type`, `order`. Used by `BlockRenderer` and the two editors.

### Product / AmazonProduct (frontend)

Two product types at `src/types.ts`:
- `Product`: Curated affiliate product (from `affiliate-products.json`) — used for sidebar recommendations
- `AmazonProduct`: Bot-generated product link (from frontmatter) — rendered by `AmazonProductGrid`

## Entry Points

**Frontend:**
- `src/main.tsx`: React app bootstrap, router definition, mounts to `#root`
- `src/App.tsx`: Landing page component (not wrapped in Layout)

**Server:**
- `server.js`: Express API server, `node server.js` or `npm run server`

**Bot:**
- `bot/scheduler.py`: Pipeline orchestrator, `python bot/scheduler.py --once`
- `bot/run-cron.ps1`: Windows Task Scheduler wrapper

**Build:**
- `scripts/build-blog.js`: Markdown → JSON build, `npm run build:blog`
- `vite build`: Production frontend bundle

**Dev:**
- `npm run dev:full`: Runs Express server + Vite dev server concurrently

## Error Handling

**Bot pipeline:** Each stage has retry logic (tenacity library, 2-3 attempts with exponential backoff). Writer/refiner abort on content below minimum word counts — refuse to publish thin content. On crash, `scheduler.py` saves partial drafts to `bot/.tmp/drafts/` for auto-resume on next run. Discord webhook notifications on success/failure.

**Frontend:** `blogUtils.ts` swallows fetch errors and returns empty arrays. Individual pages show loading spinners and error states. No global error boundary.

**Server:** try/catch per endpoint, returns 400/404/500 JSON errors. `npm run build:blog` failures are logged but don't block the API response.

## Cross-Cutting Concerns

**Configuration:** Bot uses `bot/config.py` with dataclass-based typed config. Reads from `bot/.env`. Covers AI provider (OpenRouter/OpenAI/Ollama), Reddit credentials, RSS feeds, Amazon PA-API, Unsplash, Git settings, and content policy (min/max words, relevance keywords, topic classification keywords).

**Logging:** Bot uses Python `logging` module with console + file handlers (`bot/logs/`). Frontend uses `console.log/error`. No structured logging framework on either side.

**Authentication:** None. The Express API has no auth. The blog editors (`/blog/editor`, `/blog-editor`) are unprotected. Bot uses API keys for external services only.

**Scheduling:** Windows Task Scheduler via `bot/run-cron.ps1` (every 30 min). Bot also supports daemon mode (`--daemon`) using the `schedule` library. Produces 3 articles per run.

**Deployment:** Git push to remote triggers build (Netlify/CF Pages build hook). Static site in production — `public/blog-posts.json` serves all content. Express server is development-only.

---

*Architecture analysis: 2026-02-27*
