# Phase 07 Context

**Source:** User request (plan-phase)

## User request

- **Better way of handling images** for both main (cover) and inline images. What we have now either isn't working or hasn't been implemented on currently published blogs.
- **Newest blogs should be shown at the top** of the blog. User doesn't understand the way they're being added — is it backwards?

## Current state (from codebase)

- **Build order:** `scripts/build-blog.js` sorts by `publishedDate` descending (newest first) when writing `blog-posts.json`. `BlogHome.tsx` also sorts with `sortByDate` (newest first) when loading. So order is *intended* to be newest first; if user sees oldest first, something may be wrong (cache, different data source, or UI bug).
- **Cover images:** Frontmatter `coverImage` flows through build to JSON; used in BlogPost, BlogHome, App, BlogFeaturedSlideshow. Bot sets `coverImage` via `image_fetcher.py`. Some published posts have Amazon or Unsplash URLs.
- **Inline images:** Post body is markdown; `BlockRenderer` + `MarkdownRenderer` render content blocks. ReactMarkdown has custom `img` component. Inline images in markdown (e.g. `![alt](url)`) should render. Frontmatter `images` array exists but may be separate from body markdown; need to confirm where inline images are expected (in content vs array) and that both work on published posts.

## Planning focus

1. **Images:** Audit full path for cover and inline images (bot → markdown → build → JSON → UI). Fix broken or unimplemented behavior so published blogs show main and inline images reliably.
2. **Order:** Verify newest-first end-to-end; fix any place that shows or implies oldest-first; document so "backwards" confusion is resolved.
