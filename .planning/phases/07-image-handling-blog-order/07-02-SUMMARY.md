# Phase 07-02 Summary: Blog Order (API + Docs)

**Completed:** 2026-02-28

## Objective

Fix blog order when using the dev API so the list is never backwards; document that blog order is newest-first everywhere.

## Changes Made

### 1. Sort GET /api/posts by publishedDate descending

- **server.js**
  - In `GET /api/posts`, after building the `posts` array and before `res.json(posts)`, added sort by `publishedDate` descending (newest first).
  - Comparator: `(a, b) => (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)` where `ta`/`tb` are `new Date(a.publishedDate || 0).getTime()` so missing/invalid dates sort to the end.

### 2. Document blog order in BLOG-README.md

- **BLOG-README.md**
  - Added subsection **"Blog order"** under "How The Static Build Process Works".
  - States: blog order is newest-first everywhere; build script writes sorted JSON; dev API returns newest-first; frontend list views sort by date; most recent post appears at top.

## Verification

- `npm run build` — success.
- API contract: when using dev server, `GET /api/posts` returns posts with newest first.

## Success Criteria Met

- GET /api/posts returns posts with newest first.
- BLOG-README.md documents that blog order is newest-first across build, API, and frontend.
