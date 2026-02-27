# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript ^5.5.3 — Frontend SPA (`src/**/*.tsx`, `src/**/*.ts`), Vite config, ESLint config
- Python 3.x — Bot content pipeline (`bot/*.py`, 14 modules)

**Secondary:**
- JavaScript (ES Modules) — Express API server (`server.js`), build script (`scripts/build-blog.js`), PostCSS/Tailwind config
- CSS — Tailwind utility classes + custom keyframes (`src/index.css`)
- HTML — Single-page entry point (`index.html`)
- Markdown — Blog post content (`src/blog/posts/*.md`)

## Runtime

**Frontend:**
- Node.js (no `.nvmrc`; version not pinned — uses ESM via `"type": "module"` in `package.json`)
- Browser target: ES2020 (`tsconfig.app.json`)

**Bot:**
- Python 3.x (no `.python-version`; version not pinned — requires >=3.10 for `match`/union type syntax in `utils.py`)
- SQLite3 (built-in) for deduplication database

**Package Manager:**
- npm (no lockfile committed — `package-lock.json` not present)
- pip for Python (`bot/requirements.txt`)

## Frameworks

**Core Frontend:**
- React ^18.3.1 — UI library (`src/main.tsx` entry point)
- React Router DOM ^6.22.3 — Client-side routing (`createBrowserRouter` in `src/main.tsx`)
- Vite ^5.4.2 — Dev server and production bundler (`vite.config.ts`)
- Tailwind CSS ^3.4.1 — Utility-first styling with `@tailwindcss/typography` ^0.5.10 plugin

**Backend Server:**
- Express ^4.21.2 — REST API for blog CRUD operations (`server.js`, port 3001)

**Bot Pipeline:**
- OpenAI Python SDK >=1.35.0 — LLM calls for article generation (supports OpenRouter, OpenAI, Ollama)
- PRAW 7.7.1 — Reddit API client
- schedule 1.2.2 — Daemon-mode task scheduling
- GitPython 3.1.43 — Automated git commit/push after publishing

**Build/Dev:**
- @vitejs/plugin-react ^4.3.1 — React Fast Refresh for Vite
- PostCSS ^8.4.35 + Autoprefixer ^10.4.18 — CSS processing pipeline (`postcss.config.js`)
- ESLint ^9.9.1 + typescript-eslint ^8.3.0 — Linting (`eslint.config.js`)
- concurrently ^8.2.2 — Run Express + Vite dev servers in parallel (`npm run dev:full`)

## Key Dependencies

### Frontend — Production

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `react-router-dom` | ^6.22.3 | Client-side routing (6 routes defined in `src/main.tsx`) |
| `react-markdown` | ^9.1.0 | Render markdown content in blog posts |
| `remark-gfm` | ^4.0.1 | GitHub-flavored markdown support |
| `marked` | ^15.0.7 | Markdown parsing (build pipeline / server) |
| `gray-matter` | ^4.0.3 | YAML frontmatter parsing (server + build script) |
| `lucide-react` | ^0.344.0 | Icon library (excluded from Vite optimizeDeps) |
| `react-feather` | ^2.0.10 | Additional icon library |
| `three` | ^0.182.0 | 3D graphics (`TunnelAnimation` component) |
| `chart.js` | ^4.4.3 + `react-chartjs-2` ^5.2.0 | Data visualisation |
| `react-beautiful-dnd` | ^13.1.1 | Drag-and-drop for blog editor |
| `react-twitter-widgets` | ^1.11.0 | Embedded tweets |
| `express` | ^4.21.2 | REST API server for blog post CRUD |
| `cors` | ^2.8.5 | CORS middleware for Express |
| `uuid` | ^11.1.0 | Unique ID generation |

### Frontend — Dev

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^5.4.2 | Build tool and dev server |
| `typescript` | ^5.5.3 | Type checking |
| `tailwindcss` | ^3.4.1 | Utility CSS framework |
| `@tailwindcss/typography` | ^0.5.10 | Prose styling for markdown content |
| `postcss` | ^8.4.35 | CSS transform pipeline |
| `autoprefixer` | ^10.4.18 | Vendor prefix automation |
| `eslint` | ^9.9.1 | Linting |
| `typescript-eslint` | ^8.3.0 | TypeScript ESLint rules |
| `eslint-plugin-react-hooks` | ^5.1.0-rc.0 | React hooks linting |
| `eslint-plugin-react-refresh` | ^0.4.11 | Fast Refresh boundary linting |
| `concurrently` | ^8.2.2 | Parallel process runner |

### Bot — Python Dependencies (`bot/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| `praw` | 7.7.1 | Reddit API (PRAW) client |
| `feedparser` | 6.0.11 | RSS feed parsing |
| `httpx` | 0.27.0 | Async-capable HTTP client (Reddit keyless, Ollama, webhooks) |
| `requests` | 2.32.3 | HTTP client (secondary) |
| `beautifulsoup4` | 4.12.3 | HTML parsing for article extraction |
| `lxml` | >=5.2.2 | Fast HTML/XML parser backend for BeautifulSoup |
| `openai` | >=1.35.0 | OpenAI-compatible API client (OpenRouter, OpenAI, Ollama) |
| `Pillow` | >=11.0.0 | Image processing |
| `python-frontmatter` | 1.1.0 | Markdown frontmatter read/write |
| `Jinja2` | >=3.1.4 | Template rendering |
| `schedule` | 1.2.2 | Cron-like scheduling for daemon mode |
| `gitpython` | 3.1.43 | Git operations (add, commit, push) |
| `python-dotenv` | 1.0.1 | `.env` file loading |
| `tenacity` | 8.3.0 | Retry logic with exponential backoff |
| `python-slugify` | 8.0.4 | URL slug generation |

**Optional (not on PyPI):**
- `paapi5-python-sdk` 1.0.0 — Amazon PA-API 5.0 (manual install; bot uses search URL fallback without it)

## External Services & APIs

### AI Providers (configurable via `AI_PROVIDER` env var in `bot/.env`)

| Provider | Config Key | Default Model | Usage |
|----------|-----------|---------------|-------|
| **OpenRouter** (recommended) | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-70b-instruct:free` | Article writing, refining, editing (2 AI calls per article) |
| **OpenAI Direct** | `OPENAI_API_KEY` | `gpt-4o` | Fallback when OpenRouter unavailable |
| **Ollama** (local) | `OLLAMA_BASE_URL` | `llama3` at `http://localhost:11434` | Self-hosted LLM on NAS |

All three use the OpenAI Python SDK's `chat.completions.create` interface. OpenRouter and Ollama are accessed via compatible base URLs. See `bot/ai_writer.py` for the provider cascade logic.

### Reddit API
- **Client:** PRAW 7.7.1 (authenticated) with keyless JSON feed fallback (`bot/scraper.py`)
- **Env vars:** `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- **Subreddits monitored:** hardware, buildapc, nvidia, Amd, GameDeals, pcgaming, gadgets, technology, StockMarket, PS5, XboxSeriesX

### RSS Feeds
- **Client:** feedparser 6.0.11 via httpx (`bot/scraper.py`)
- **Sources:** Tom's Hardware, HotHardware, Hexus, The Verge Tech, Ars Technica, Eurogamer, WCCFTech

### Amazon Associates
- **PA-API 5.0** (optional): `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`
- **Fallback:** Search URL with affiliate tag (always earns commission) — `bot/amazon_linker.py`
- **Default region:** UK (`webservices.amazon.co.uk`, tag `ctrlaltstock-21`)

### Unsplash API
- **Client:** httpx direct calls to `https://api.unsplash.com` (`bot/image_fetcher.py`)
- **Env var:** `UNSPLASH_ACCESS_KEY`
- **Fallback:** Curated stock images from `bot/stock_images.json`

### Discord Webhooks
- **Env var:** `DISCORD_WEBHOOK_URL`
- **Purpose:** Admin notifications on publish success/failure (`bot/publisher.py`)

### Deployment / Build Hooks
- **Env var:** `BUILD_HOOK_URL`
- **Purpose:** Trigger Netlify/Cloudflare Pages rebuild after git push (`bot/publisher.py`)

### External CDNs / Services (Frontend)
- **Google Fonts:** Titillium Web (loaded in `index.html`)
- **Twitter Widgets:** `platform.twitter.com/widgets.js` (loaded in `index.html`)
- **DiceBear Avatars:** `api.dicebear.com/7.x/` for generated user avatars

## Data Storage

**Blog Content (filesystem):**
- Markdown posts: `src/blog/posts/*.md` (source of truth)
- Static JSON: `public/blog-posts.json` (generated by `scripts/build-blog.js` at build time)
- Curated products: `public/affiliate-products.json`

**Bot Database:**
- SQLite3: `bot/seen_posts.db` — deduplication of scraped stories
- JSON tracking: `bot/used_images.json` — image reuse prevention
- JSON tracking: `bot/stock_images.json` — curated Unsplash image pools

**Bot Temporary Files:**
- Drafts: `bot/.tmp/drafts/*.json` — partial drafts for crash recovery
- Logs: `bot/logs/*.log` — per-module log files
- Rejected candidates: `bot/logs/rejected_candidates.jsonl`

## Configuration

### Frontend Environment
- No `.env` file for frontend; all config is in source files
- Express server port: `process.env.PORT || 3001` (`server.js`)
- Vite dev server: default port 5173

### Bot Environment (`bot/.env`)
- Loaded via `python-dotenv` in `bot/config.py`
- 20+ configurable env vars (see `bot/.env.example`)
- Typed config via Python dataclasses in `bot/config.py`

### TypeScript Configuration
- `tsconfig.json` — project references setup (delegates to app + node configs)
- `tsconfig.app.json` — ES2020 target, strict mode, React JSX, bundler module resolution
- `tsconfig.node.json` — ES2022 target for Vite config

### Build Configuration
- `vite.config.ts` — React plugin, lucide-react excluded from optimizeDeps
- `tailwind.config.js` — Custom font (Titillium Web), dark theme prose styling, typography plugin
- `postcss.config.js` — Tailwind + Autoprefixer
- `eslint.config.js` — Flat config, TypeScript + React Hooks rules

## Build Pipeline

**Frontend Build (`npm run build`):**
1. `npm run build:blog` → `node scripts/build-blog.js` — Reads all `.md` files from `src/blog/posts/`, parses frontmatter with `gray-matter`, outputs `public/blog-posts.json`
2. `vite build` → Bundles React app to `dist/`

**Bot Pipeline (`python bot/scheduler.py --once`):**
1. `scraper.py` — Scrape Reddit + RSS, rank by relevance/diversity/similarity
2. `ai_writer.py` — Generate article draft via LLM
3. `ai_refiner.py` — Expand and fact-check via LLM
4. `ai_editor.py` — SEO + internal linking via LLM
5. `amazon_linker.py` — Match/find Amazon affiliate products
6. `image_fetcher.py` — Fetch cover + inline images
7. `publisher.py` — Write `.md`, rebuild JSON, git commit/push, Discord notify

**Dev Commands:**
- `npm run dev` — Vite dev server only
- `npm run dev:full` — Express + Vite in parallel via concurrently
- `npm run server` — Express API only (port 3001)
- `npm run build:blog` — Rebuild `blog-posts.json` from markdown
- `npm run lint` — ESLint

## Platform Requirements

**Development:**
- Node.js (ES module support required; likely >=18)
- Python >=3.10 (for type union syntax `Path | None`)
- npm
- pip

**Production / Deployment:**
- Static hosting (Netlify or Cloudflare Pages — inferred from build hook support)
- Git repository (for bot auto-publish via GitPython)
- Cron or Task Scheduler for bot runs (`python bot/scheduler.py --once` every 30 minutes)

---

*Stack analysis: 2026-02-27*
