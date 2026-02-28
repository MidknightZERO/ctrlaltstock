# Phase 07: Image Handling & Blog Order - Research

**Researched:** 2025-02-28
**Domain:** Cover/inline image data flow; blog post ordering (newest-first)
**Confidence:** HIGH (codebase audit; no external libs)

## Summary

This phase is an **audit-and-fix** of two areas: (1) **image handling** — cover image and inline images from frontmatter and markdown through build, API, JSON, and UI; (2) **blog order** — ensuring newest-first everywhere and documenting it. The codebase was traced end-to-end; findings are below.

**Cover images:** Flow is frontmatter → build/API → JSON → BlogPost, BlogHome, App, BlogFeaturedSlideshow, Home, BlogPreview. The build does **not** normalize `coverImage`; one post in `public/blog-posts.json` has a long srcset-style string (e.g. `resident-evil-requiem-df-analysis`), which can break `<img src="...">`. The bot (`image_fetcher.py`) sets a single URL; legacy or manual frontmatter can still contain srcset. Several UI consumers render cover without `onError` or fallback.

**Inline images:** Inline images in **markdown** (e.g. `![alt](url)` in body or in contentBlocks text) are rendered via BlockRenderer → MarkdownRenderer, which has a custom `img` component but no `onError`. The frontmatter **`images` array** is passed through build and API and exists on `BlogPost`, but **is never rendered** on the post page — so bot-published posts that only set `images` (and no markdown images in body) show no inline images.

**Blog order:** The build script sorts by `publishedDate` descending (newest first). The **dev API** `GET /api/posts` does **not** sort and returns filesystem order. All frontend consumers (BlogHome, App, BlogPreview) sort client-side after fetch, so **displayed** order is correct when they run; the bug is the API contract and any direct API consumer. BLOG-README does not document blog order.

**Primary recommendation:** Normalize coverImage in the build to a single URL (srcset → first URL); sort `GET /api/posts` by date descending and document newest-first in BLOG-README; optionally render `post.images` on the post page when present; add `order` to content blocks in build and defensive fallbacks/onError for images.

---

## 1. Cover image data flow and break points

### Flow (end-to-end)

| Step | Location | Behavior | Break point? |
|------|----------|----------|--------------|
| Bot | `bot/image_fetcher.py` | Sets `frontmatter.coverImage = unique_images[0]` (single URL), `frontmatter.images = unique_images[1:4]` | No — bot uses single URL |
| Markdown | `src/blog/posts/*.md` | Frontmatter `coverImage` can be single URL or legacy srcset string | Yes — manual/legacy srcset |
| Build | `scripts/build-blog.js` | `coverImage: String(frontMatter.coverImage \|\| '')` — no normalization | Yes — srcset passed through |
| JSON | `public/blog-posts.json` | At least one post has long srcset in `coverImage` | Yes — invalid for single `<img src>` |
| Server | `server.js` GET `/api/posts`, `/api/posts/:slug` | `coverImage: frontMatter.coverImage` | Same as build |
| BlogHome | `src/blog/BlogHome.tsx` | `post.coverImage ? <img src={post.coverImage}>` else gradient div | No onError; srcset could break |
| BlogPost | `src/blog/BlogPost.tsx` | `post.coverImage && <img src={post.coverImage}>` | No onError |
| App | `src/App.tsx` | `blogPosts[0].coverImage && <img src={...}>` | No onError |
| BlogFeaturedSlideshow | `src/components/BlogFeaturedSlideshow.tsx` | `post.coverImage && <img src={post.coverImage}>` | No onError |
| Home | `src/components/Home.tsx` | `post.coverImage \|\| 'https://via.placeholder.com/...'` | Has fallback |
| BlogPreview | `src/components/BlogPreview.tsx` | `post.coverImage \|\| 'https://i.imgur.com/...'` + onError | Has fallback |

### Where it can break

1. **Build does not normalize srcset:** If `coverImage` is a srcset string (e.g. `url1 208w, url2 416w, ...`), the whole string is written to JSON and used as `src`. Browsers may use the first token or show broken image. **Fix:** In `build-blog.js`, normalize to a single URL: if value contains comma + spaces/width descriptor, take the first URL (split by comma, take first segment, trim, strip trailing ` 123w` etc.).
2. **No onError/fallback on main views:** BlogHome, BlogPost, App, BlogFeaturedSlideshow do not set `onError` on cover `<img>`. Invalid or failing URLs show broken icon. **Fix:** Use a shared fallback (e.g. `/Logo.png` or placeholder) in onError and/or when `coverImage` is missing/empty.
3. **Server POST /api/posts:** When saving a post, server passes `post.coverImage` into frontmatter; no normalization there either — acceptable if build normalizes on next build; for dev-only API, optional to normalize on save.

---

## 2. Inline images data flow and break points

### Two sources of “inline” images

- **Markdown in content:** `![alt](url)` in the post body. Body is either (a) in `content` (raw markdown) or (b) inside `contentBlocks[].content` (per-section text with markdown).
- **Frontmatter `images` array:** Bot sets `frontmatter.images = unique_images[1:4]`; build and API put it on `post.images`. **Not rendered anywhere** on the post page.

### Flow for markdown inline images

| Step | Location | Behavior | Break point? |
|------|----------|----------|--------------|
| Build | `scripts/build-blog.js` | `processContentBlocks(markdownContent)` splits by headings; each block is `{ type: 'text', id, content }` — **no `order`** | Yes — see BlockRenderer sort below |
| Build | Same | `contentBlocks` from frontmatter or generated; frontmatter `images` → `post.images` | N/A for rendering — images array unused in UI |
| BlogPost | `src/blog/BlogPost.tsx` | If `contentBlocks.length > 0` → BlockRenderer; else `content` → MarkdownRenderer | Correct branch for both |
| BlockRenderer | `src/blog/components/BlockRenderer.tsx` | For `type: 'text'` renders `MarkdownRenderer content={textBlock.content}`; sorts blocks by `a.order - b.order` | Yes — build blocks have no `order` → NaN sort |
| MarkdownRenderer | `src/blog/components/MarkdownRenderer.tsx` | Custom `img` component (figure wrapper); **no onError** | Yes — broken URLs show broken icon |

### Where it can break

1. **Frontmatter `images` never rendered:** Bot and frontmatter can set `images: [url1, url2, ...]`. These are in the JSON and on `post.images` but BlogPost does not render them. So posts that only have `images` and no `![...](...)` in body show no inline images. **Fix:** When rendering the post body, if `post.images` exists and has length, render them (e.g. after content or as a gallery). 07-CONTEXT/07-01-PLAN: “ensure frontmatter images array is rendered when contentBlocks don't include images.”
2. **Content blocks missing `order`:** `processContentBlocks` in build creates blocks with `type`, `id`, `content` but no `order`. BlockRenderer does `sort((a, b) => a.order - b.order)`; with `order` undefined this is NaN — implementation-defined sort. **Fix:** In build, set `order: i` on each block; optionally in BlockRenderer use `(a.order ?? index)` for stable sort.
3. **MarkdownRenderer `img` has no onError:** Inline images that fail to load show broken icon. **Fix:** Add onError (e.g. placeholder or hide).

### Flow for frontmatter-only images (current gap)

- Bot sets `coverImage` + `images`. Cover is shown in header; `images` are in data but not rendered in body. No other code injects `post.images` into the post content.

---

## 3. Blog order — all places that determine order

| Place | Behavior | Newest first? |
|-------|----------|----------------|
| `scripts/build-blog.js` | Sort before write: `new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()` | Yes |
| `server.js` GET `/api/posts` | Builds array from `fs.readdir` + read files; **no sort**; `res.json(posts)` | **No** — filesystem order |
| `src/blog/utils/blogUtils.ts` | `getAllPosts()` returns API or `/blog-posts.json` as-is; `updateCache(posts)` stores that order | Depends on source |
| `src/blog/BlogHome.tsx` | After fetch: `[...rawPosts].sort(sortByDate)` (newest first) | Yes (after load) |
| `src/App.tsx` | After getAllPosts: `[...posts].sort((a,b) => new Date(b.publishedDate).getTime() - ...)` | Yes |
| `src/components/BlogPreview.tsx` | Uses `import.meta.glob` then `.sort((a,b) => new Date(b.publishedDate).getTime() - ...)` | Yes |
| Cache | `getAllPostsSync()` / cache used for initial paint in BlogHome; cache holds last fetch order | API fetch = wrong order until sorted |

So: **only the dev API** returns unsorted order. All frontend list views sort after fetch, so the user sees newest-first. The bug is (1) API contract (wrong order), (2) possible brief wrong order from cache before re-sort, (3) no documentation. Invalid/missing `publishedDate` in sort can yield NaN; handling them as epoch 0 pushes them to the end.

---

## 4. Recommendations and edge cases

### Cover images

- **Normalize in build:** In `scripts/build-blog.js`, when setting `coverImage`, if the value looks like a srcset (contains `,` and optional width descriptor like ` 208w`), normalize to a single URL: split by `,`, take first segment, trim, strip trailing ` \d+w` (or similar), use that as `post.coverImage`.
- **Consumers:** Ensure every place that renders cover image either uses a fallback when missing/empty or has `onError` pointing to a shared placeholder (e.g. `/Logo.png`). BlogHome, BlogPost, App, BlogFeaturedSlideshow currently have no onError; Home and BlogPreview already have fallbacks.

### Inline images

- **Frontmatter `images`:** Render `post.images` on the post page when present (e.g. after main content or in a simple gallery) so bot-published posts with only `images` (no markdown images) show them. Keep existing markdown image rendering as-is.
- **Content blocks:** Add `order: i` in `processContentBlocks` in build so BlockRenderer’s sort is well-defined. Optionally make BlockRenderer defensive: `sort((a, b) => (a.order ?? indexOf(a)) - (b.order ?? indexOf(b)))` or equivalent.
- **MarkdownRenderer:** Add `onError` on the custom `img` component (e.g. set src to placeholder or hide).

### Blog order

- **API:** In `server.js` GET `/api/posts`, after building the `posts` array and before `res.json(posts)`, sort by `publishedDate` descending (same logic as build). Treat missing/invalid date as epoch 0 so those sort to the end.
- **Docs:** Add a short “Blog order” subsection in BLOG-README.md: newest-first everywhere; build writes sorted JSON; dev API returns newest-first; frontend list views sort by date.

### Edge cases

- **Missing/invalid publishedDate:** Use `new Date(x).getTime()` and treat NaN as 0 so sort is deterministic and invalid dates go to the end.
- **Broken image URLs:** Rely on onError + fallback everywhere (cover and inline).
- **Empty coverImage:** Already conditional; use shared placeholder where desired so layout doesn’t look broken.
- **Frontmatter `images` with malformed entries:** If rendering `post.images`, filter to valid strings and optionally normalize URLs (e.g. trim); onError per image for robustness.

---

## 5. Don’t hand-roll

| Problem | Don’t build | Use instead | Why |
|---------|-------------|-------------|-----|
| Parsing srcset string | Custom regex for every variant | Split by comma, take first segment, trim, strip ` \d+w` | Simple and sufficient for current data |
| Image fallback | Per-component custom logic | Shared constant (e.g. `/Logo.png`) + single onError pattern | Consistency and one place to change |
| Date sorting | Multiple ad-hoc sorts | Same comparator everywhere: `(a,b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()` (with invalid = 0) | Predictable order |

---

## 6. Code references (for planner)

### Build — coverImage and contentBlocks (scripts/build-blog.js)

- Cover today: `coverImage: String(frontMatter.coverImage || '')` (line ~183). Add normalization before this assignment when value contains `,`.
- Content blocks: `contentBlocks.push({ type: 'text', id: \`block-${i}\`, content: ... })` (lines 61–65, 73–76). Add `order: i` (and for the second loop, use a running index).

### Server — order (server.js)

- GET `/api/posts`: after the `for` loop that builds `posts`, add:
  `posts.sort((a, b) => new Date(b.publishedDate || 0).getTime() - new Date(a.publishedDate || 0).getTime());`
  then `res.json(posts)`.

### BlogPost — body rendering (src/blog/BlogPost.tsx)

- Content: `post.contentBlocks?.length > 0 ? BlockRenderer : post.content ? MarkdownRenderer : "no content"`. To support frontmatter images: after the main content block, if `post.images?.length > 0`, render a section (e.g. gallery or list of images).

### BlockRenderer — sort (src/blog/components/BlockRenderer.tsx)

- Current: `const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);`
- After build adds `order`: no change. If you want defensive: `sort((a, b) => (a.order ?? 0) - (b.order ?? 0))` or use index when order is missing.

### MarkdownRenderer — img (src/blog/components/MarkdownRenderer.tsx)

- Custom `img` in `components`: add `onError={(e) => { (e.target as HTMLImageElement).src = '/Logo.png'; }}` (or shared constant).

---

## 7. Sources

- **Primary:** Direct codebase audit of `scripts/build-blog.js`, `server.js`, `src/blog/BlogHome.tsx`, `src/blog/BlogPost.tsx`, `src/blog/components/BlockRenderer.tsx`, `src/blog/components/MarkdownRenderer.tsx`, `src/blog/utils/blogUtils.ts`, `src/App.tsx`, `src/components/BlogPreview.tsx`, `src/components/Home.tsx`, `src/components/BlogFeaturedSlideshow.tsx`, `bot/image_fetcher.py`, `public/blog-posts.json` (sample), `src/blog/posts/*.md` (sample), `.planning/phases/07-image-handling-blog-order/07-CONTEXT.md`, `07-01-PLAN.md`, `07-02-PLAN.md`.

---

## 8. Metadata

**Confidence:** HIGH — all conclusions from tracing the repo.

**Research date:** 2025-02-28  
**Valid until:** Stable; re-audit if build or server API change.

---

## RESEARCH COMPLETE

**Phase:** 07 - Image Handling & Blog Order  
**Confidence:** HIGH

### Key findings

1. **Cover:** Build does not normalize srcset; one post has long srcset in JSON. Normalize in build to single URL; add onError/fallback in BlogHome, BlogPost, App, BlogFeaturedSlideshow.
2. **Inline:** Markdown images work via BlockRenderer/MarkdownRenderer. Frontmatter `post.images` is never rendered — add a section that renders `post.images` when present. Build contentBlocks lack `order` → fix in build; MarkdownRenderer `img` needs onError.
3. **Order:** Only `GET /api/posts` is wrong (filesystem order). Sort by publishedDate descending in server; document newest-first in BLOG-README.
4. **Edge cases:** Invalid/missing dates → treat as 0 in sort; broken image URLs → onError everywhere; empty cover → existing conditional + shared fallback where desired.

### File created

`c:\Users\jacob\Downloads\WebDev\Blog\.planning\phases\07-image-handling-blog-order\07-RESEARCH.md`

### Ready for planning

Planner can use this to implement 07-01 (cover + inline images) and 07-02 (API order + docs) with concrete file/line references and edge-case handling.
