# Phase 07-01 Summary: Image Handling (Cover + Inline)

**Completed:** 2026-02-28

## Objective

Audit and fix cover image flow and inline images so published posts show main and inline images correctly, with fallbacks and defensive handling.

## Changes Made

### 1. Normalize coverImage in build and fallbacks/onError in all views

- **scripts/build-blog.js**
  - Added `normalizeCoverImage(raw)` to convert srcset-style strings (e.g. `url1 208w, url2 416w`) to a single URL (first segment).
  - `coverImage` in output is now always a single URL when frontmatter had a srcset.
- **Cover image consumers** — added `onError` to set `src` to `/Logo.png` when image fails to load:
  - `src/blog/BlogHome.tsx` — cover img in post cards
  - `src/blog/BlogPost.tsx` — main cover img and related-post cover imgs
  - `src/App.tsx` — latest post hero img
  - `src/components/Home.tsx` — post card img (already had fallback; added onError)
  - `src/components/BlogFeaturedSlideshow.tsx` — slide cover img
  - BlogPreview.tsx already had onError; left as-is.

### 2. Render frontmatter images (post.images) on post page

- **src/blog/BlogPost.tsx**
  - After main content and before Discord CTA: when `post.images?.length > 0`, render an "Images" section with each URL in a grid (white padded container, rounded, same style as MarkdownRenderer inline images).
  - Each img has onError fallback to `/Logo.png`.

### 3. Content block order + BlockRenderer + MarkdownRenderer img onError

- **scripts/build-blog.js**
  - Restored `processContentBlocks()` (it had been removed by an earlier edit) and added `order: i` to each content block so BlockRenderer sort is well-defined.
- **src/blog/components/BlockRenderer.tsx**
  - Sort changed to defensive: `(a.order ?? blocks.indexOf(a)) - (b.order ?? blocks.indexOf(b))` so blocks without `order` still sort stably.
- **src/blog/components/MarkdownRenderer.tsx**
  - Added `COVER_IMAGE_FALLBACK = '/Logo.png'` and `onError` on the custom `img` component so inline markdown images that fail to load show the fallback instead of a broken icon.

## Verification

- `node scripts/build-blog.js` — success; `public/blog-posts.json` has single-URL `coverImage` and content blocks include `order`.
- `npm run build` — success.
- No linter errors on modified files.

## Success Criteria Met

- Cover image flow normalized in build; all views use cover with fallback or onError.
- Inline markdown images render; post.images array rendered on post page when present.
- Content blocks have order; BlockRenderer sorts defensively; inline img onError prevents broken icon.
