# External Integrations

**Analysis Date:** 2025-02-28

## Overview

The blog uses two main integration surfaces: (1) the Express API for frontend CRUD, and (2) the bot pipeline for content generation, which integrates with external APIs and services.

---

## Internal API

**Express REST API** (`server.js`)

- **Base URL:** `http://localhost:3001/api` (dev) or `VITE_API_URL` (configurable)
- **Auth:** `Authorization: Bearer <BLOG_API_KEY>` required for POST/DELETE
- **Endpoints:** `GET/POST /posts`, `GET/PUT/DELETE /posts/:slug`
- **Files:** `server.js`, `src/blog/utils/blogUtils.ts`
- **Note:** Frontend `blogUtils.savePost`/`deletePost` do not currently send the API key; editors will receive 403 unless configured.

---

## Bot Integrations

**Config:** `bot/config.py` reads from `bot/.env`. See `bot/.env.example` for full list.

### AI Providers

| Provider | Env Var | Default | Use |
|----------|---------|---------|-----|
| OpenRouter | `OPENROUTER_API_KEY` | — | Article writing, refining, editing (2 calls per article) |
| OpenAI Direct | `OPENAI_API_KEY` | — | Fallback when OpenRouter unavailable |
| Ollama | `OLLAMA_BASE_URL` | `http://localhost:11434` | Local LLM on NAS |

**Files:** `bot/ai_editor.py`, `bot/ai_refiner.py` — via `ai` config from `bot/config.py`

### Reddit API

- **Purpose:** Content discovery (Reddit posts as article seeds)
- **Auth:** `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- **Files:** `bot/` (scraper, PRAW or keyless `/new.json`)
- **Docs:** `bot/directives/scrape.md` — OAuth failures indicate credential issues

### RSS Feeds

- **Purpose:** RSS-based news aggregation
- **Config:** `RSSConfig` in `bot/config.py` — Tom's Hardware, HotHardware, Hexus, The Verge, Ars Technica, Eurogamer, WCCFTech
- **Files:** `bot/` (scraper, feed parser)

### Amazon Product Advertising API (PA-API 5.0)

- **Purpose:** Affiliate product links in articles
- **Auth:** `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`
- **Region:** `AMAZON_REGION` (default `uk`), `AMAZON_MARKETPLACE` (default `webservices.amazon.co.uk`)
- **Files:** `bot/amazon_linker.py` — uses `paapi5_python_sdk.api.default_api.DefaultApi`

### Unsplash API

- **Purpose:** Free stock images for articles
- **Auth:** `UNSPLASH_ACCESS_KEY`
- **Base URL:** `https://api.unsplash.com`
- **Files:** `bot/image_fetcher.py`, `bot/config.py` (`UnsplashConfig`)

### Git / Deployment

- **Repo:** `REPO_PATH`, `GIT_REMOTE`, `GIT_BRANCH` — bot uses Git for publishing
- **Build Hooks:** `BUILD_HOOK_URL` — Netlify (`https://api.netlify.com/build_hooks/...`) or Cloudflare Pages (`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...`)

### Discord Webhook

- **Purpose:** Admin notifications (success/failure alerts)
- **Config:** `DISCORD_WEBHOOK_URL`
- **URL:** `https://discord.com/api/webhooks/...`

---

## Frontend Data Sources

| Source | Purpose | File |
|--------|---------|------|
| `fetch(`${API_URL}/posts`)` | Live blog posts (dev) | `src/blog/utils/blogUtils.ts` |
| `fetch('/blog-posts.json')` | Static fallback (production) | `src/blog/utils/blogUtils.ts` |
| `fetch('/affiliate-products.json')` | Product data | `src/blog/data/productData.ts` |
| `api.dicebear.com/7.x/` | Generated avatars | `src/blog/LocalEditor.tsx` |

---

## Auth Providers

- **None** — No user auth (OAuth, etc.). Editors use `BLOG_API_KEY` for server-side API protection.
- **Bot:** All API keys stored in `bot/.env`; `.gitignore` includes `bot/.env` and `.env`.

---

## Databases

- **No traditional DB** — Blog posts are Markdown files in `src/blog/posts/`
- **Bot:** SQLite `seen_posts.db` in `bot/` for tracking processed Reddit/RSS items

---

*Integrations analysis: 2025-02-28*
