# Technology Stack

**Analysis Date:** 2025-02-28

## Languages

**Primary:**
- TypeScript 5.5.3 - Frontend (`src/`), Vite config, build scripts
- JavaScript (ESM) - `server.js`, `scripts/build-blog.js`, `scripts/debug-netlify-404.js`

**Secondary:**
- Python 3.x - Bot automation in `bot/` (scraper, AI writer, publisher, image fetcher, Amazon linker)

## Runtime

**Environment:**
- Node.js (ES2020 for app, ES2022 for config) - Implied by `tsconfig.app.json` and `tsconfig.node.json`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present if generated)

## Frameworks

**Core:**
- React 18.3.1 - UI framework
- Vite 5.4.2 - Build tool and dev server
- Express 4.21.2 - Backend API server (`server.js`)

**Testing:**
- Not detected (no Jest, Vitest, or test config found)

**Build/Dev:**
- @vitejs/plugin-react 4.3.1 - React Fast Refresh
- PostCSS 8.4.35 - CSS processing
- Autoprefixer 10.4.18 - Vendor prefixes
- Tailwind CSS 3.4.1 - Utility-first CSS
- ESLint 9.9.1 - Linting (flat config in `eslint.config.js`)
- TypeScript 5.5.3 - Type checking
- concurrently 8.2.2 - Run server + dev in parallel (`dev:full`)

## Key Dependencies

**Critical:**
- react-router-dom 6.22.3 - Client-side routing
- gray-matter 4.0.3 - Markdown frontmatter parsing (server + build)
- react-markdown 9.1.0 + remark-gfm 4.0.1 - Markdown rendering
- marked 15.0.7 - Markdown parsing
- lucide-react 0.344.0 - Icons
- react-feather 2.0.10 - Additional icons
- three 0.182.0 - 3D animations (TunnelAnimation, BlogPageBackground)
- chart.js 4.4.3 + react-chartjs-2 5.2.0 - Charts
- react-beautiful-dnd 13.1.1 - Drag-and-drop (editor)
- uuid 11.1.0 - Unique IDs
- cors 2.8.5 - CORS middleware for Express

**Infrastructure:**
- express - REST API for blog CRUD
- node (built-in) - `fs`, `path`, `child_process` for build scripts

## Configuration

**Environment:**
- Root `.env` - `BLOG_API_KEY` for server auth
- `bot/.env` - Bot credentials (see `bot/.env.example`)
- Vite env: `VITE_API_URL` (optional, defaults to `http://localhost:3001/api`)

**Build:**
- `vite.config.ts` - Vite config, React plugin
- `tsconfig.json` - Project references to `tsconfig.app.json`, `tsconfig.node.json`
- `tsconfig.app.json` - App: ES2020, bundler, strict
- `tsconfig.node.json` - Node config (Vite)
- `tailwind.config.js` - Tailwind + @tailwindcss/typography
- `postcss.config.js` - Tailwind + Autoprefixer
- `eslint.config.js` - ESLint flat config, TypeScript, React hooks/refresh

## Platform Requirements

**Development:**
- Node.js (ES2020+)
- npm
- Python 3.x + pip (for bot)
- Git (for bot publish flow)

**Production:**
- Netlify or Cloudflare Pages (SPA with `/* /index.html 200` redirect)
- Optional: Node server for live API (or static `blog-posts.json` fallback)

---

*Stack analysis: 2025-02-28*
