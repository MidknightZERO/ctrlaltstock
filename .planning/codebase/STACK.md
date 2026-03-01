# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.5.x — frontend (`src/`), Vite config, app and blog components
- JavaScript (ESM) — build script `scripts/build-blog.js`, `server.js`

**Secondary:**
- Python 3.x — blog bot pipeline in `bot/` (scraping, AI writing, image fetch, publish)
- Markdown — blog posts in `src/blog/posts/*.md` with YAML frontmatter

## Runtime

**Environment:**
- Node.js (ESM) — frontend dev/build and API server
- Python — bot scripts; no version pinned in repo (`.python-version` not detected)

**Package Manager:**
- npm — `package.json` at repo root
- Lockfile: `package-lock.json` present if generated
- Python: pip; `bot/requirements.txt` present

## Frameworks

**Core:**
- React 18.3 — UI and blog components
- Vite 5.4 — dev server and production build
- React Router 6.x — routing

**Styling:**
- Tailwind CSS 3.4 — utility-first CSS; config in `tailwind.config.js`
- PostCSS — `postcss.config.js`; `@tailwindcss/typography` for prose

**Testing:**
- Not detected — no Jest/Vitest/Playwright config or test scripts in root `package.json`

**Build/Dev:**
- Vite — bundling, HMR, `vite.config.ts`
- ESLint 9.x — `eslint.config.js` (flat config)
- gray-matter — frontmatter parsing in `scripts/build-blog.js`
- concurrently — `dev:full` runs server + Vite

## Key Dependencies

**Critical (frontend):**
- `react`, `react-dom`, `react-router-dom` — app shell
- `react-markdown`, `remark-gfm` — rendered post content
- `lucide-react` — icons
- `chart.js`, `react-chartjs-2` — charts
- `three`, `@types/three` — 3D (if used)
- `uuid` — IDs

**Infrastructure (frontend):**
- `express`, `cors` — `server.js` API
- `marked` — markdown (if used alongside react-markdown)

**Bot (Python):**
- `httpx` — HTTP to Unsplash, Pexels, OpenRouter, Groq, etc.
- `openai` — OpenRouter/OpenAI-compatible API
- `groq` — Groq Vision for hero validation
- `python-dotenv` — load `bot/.env`
- `tenacity` — retries for image/API calls
- `python-frontmatter` — read/write post frontmatter
- `feedparser`, `praw`, `beautifulsoup4`, `lxml` — RSS, Reddit, scraping
- `gitpython` — publish step
- `schedule` — optional daemon scheduling
- `Pillow` — image handling if needed

## Configuration

**Environment:**
- Frontend: no `.env` required for basic run; optional env for API base URL etc.
- Bot: `bot/.env` (from `bot/.env.example`); loaded by `bot/config.py` via `python-dotenv` from `Path(__file__).parent` (bot dir).

**Build:**
- `vite.config.ts` — Vite (React plugin, optimizeDeps)
- `tailwind.config.js` — content paths, theme (Titillium Web, typography, colours)
- `postcss.config.js` — Tailwind
- `tsconfig.json` — references `tsconfig.app.json`, `tsconfig.node.json`
- `scripts/build-blog.js` — reads `src/blog/posts/*.md`, writes `public/blog-posts.json`

**Bot:**
- All config from env in `bot/config.py`: AI provider, Reddit, NewsAPI, GiantBomb, RSS, Amazon, Unsplash, Pexels, Groq, Git, bot behaviour (articles per run, paths, `IMAGE_REUSE_LOOKBACK_DAYS`, etc.).

## Platform Requirements

**Development:**
- Node.js (LTS recommended for Vite 5)
- Python 3.x with pip
- Optional: Reddit/NewsAPI/Amazon/Unsplash/Pexels/Groq/OpenRouter API keys for full bot pipeline

**Production:**
- Static host (e.g. Netlify, Cloudflare Pages) for Vite build; build command runs `build:blog` then `vite build`
- Optional: NAS/VPS for cron running `bot/scheduler.py --once`; Git remote for publish

---

*Stack analysis: 2026-03-01*
