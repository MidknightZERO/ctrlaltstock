# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Duplicate blog editors:**
- Issue: Two full-featured editors exist with overlapping responsibilities: `LocalEditor` (1266 lines) at `/blog/editor` and `AdvancedBlogEditor` (336 lines) at `/blog-editor`. Both support block-based editing, save/delete, and preview. LocalEditor uses BlockEditor + ProductSelector; AdvancedBlogEditor uses AdvancedBlockEditor. Different UX and code paths for the same task.
- Files: `src/blog/LocalEditor.tsx`, `src/blog/AdvancedBlogEditor.tsx`, `src/main.tsx` (routes)
- Impact: Maintenance burden. Bug fixes and features must be applied twice. New contributors unsure which to use.
- Fix approach: Consolidate into a single editor. Migrate unique features (e.g. LocalEditor's product blocks, AdvancedBlogEditor's slug-based routing) into one component. Deprecate the other route.

**LocalEditor monolithic size:**
- Issue: `LocalEditor.tsx` is 1266 lines. Contains post CRUD, block management, product selection, import/export, duplicate, toast logic, and layout in one file.
- Files: `src/blog/LocalEditor.tsx`
- Impact: Hard to test, refactor, or reason about. High cognitive load.
- Fix approach: Extract hooks (`usePosts`, `useContentBlocks`, `useProductSelection`), subcomponents (`PostListPanel`, `BlockEditorToolbar`), and shared toast usage. Target <400 lines for the main component.

**ProductSelector/ProductManager use empty products array:**
- Issue: `productData.ts` exports `products: Product[] = []` (empty). `ProductSelector` and `ProductManager` use `products`, `getAllCategories()`, `getProductById()` — all operate on this empty array. `getProductById` and `getRelatedProducts` return nothing. The async `fetchAffiliateProducts()` loads from `/affiliate-products.json` but is not used by these components.
- Files: `src/blog/data/productData.ts`, `src/blog/components/ProductSelector.tsx`, `src/blog/components/ProductManager.tsx`
- Impact: Product selection in the editor shows no products. Category dropdown empty. Effectively broken for product blocks.
- Fix approach: Wire ProductSelector/ProductManager to `fetchAffiliateProducts()` instead of `products`. Or populate `products` from affiliate-products.json at module load. Ensure `getProductById` can resolve by id from the fetched list.

**Inconsistent type import paths:**
- Issue: Some files import from `../types`, others from `../types.d` or `../../types.d`. The project has `src/types.ts` only — no `types.d.ts`. The `.d` suffix may cause resolution issues in strict setups.
- Files: `src/blog/LocalEditor.tsx` (types.d), `src/blog/BlogPost.tsx` (types.d), `src/blog/components/BlockRenderer.tsx` (types.d), others use `types`
- Impact: Potential build failures or IDE confusion. Inconsistent patterns.
- Fix approach: Standardize all imports to `../types` or `../../types` (no `.d`). Ensure `types.ts` exports all needed types.

**AdvancedBlogEditor reading time format mismatch:**
- Issue: `AdvancedBlogEditor` defines `calculateReadingTime(blocks)` returning `minutes.toString()` (e.g. `"5"`). `blogUtils.calculateReadingTime(content)` returns `"5 min read"`. Server and build script expect `readingTime` in "X min read" format.
- Files: `src/blog/AdvancedBlogEditor.tsx` (lines 166–176), `src/blog/utils/blogUtils.ts` (lines 141–147)
- Impact: Saved posts may have `readingTime: "5"` instead of `"5 min read"`. Display or sorting may break.
- Fix approach: Use `blogUtils.calculateReadingTime` or align local implementation to return `"X min read"`.

**Orphaned fix-markdown script:**
- Issue: `src/fix-markdown.js` exists but is not referenced in `package.json` scripts. Appears to be a one-off migration script.
- Files: `src/fix-markdown.js`
- Impact: Dead code. Confusion if similar fixes are needed later.
- Fix approach: Move to `scripts/fix-markdown.js` and add a script entry if still needed, or delete if obsolete.

**Empty blog-categories.json:**
- Issue: `public/blog-categories.json` has `{"categories":{}}`. The bot's `ai_editor.py` uses this for category-based internal linking; empty object forces fallback to tag-based matching.
- Files: `public/blog-categories.json`, `bot/ai_editor.py`
- Impact: Internal linking quality degraded. Editor cannot match posts by hierarchical category.
- Fix approach: Populate via build script from tags/frontmatter, or add category metadata to frontmatter and generate from there.

## Security Considerations

**Blog API: client does not send Authorization header:**
- Issue: `blogUtils.savePost` and `blogUtils.deletePost` call the Express API without `Authorization: Bearer <key>`. Server requires `BLOG_API_KEY` for POST/DELETE. Editors will receive 403 when saving or deleting.
- Files: `src/blog/utils/blogUtils.ts` (lines 87–124), `server.js` (requireAuth middleware)
- Current mitigation: Server rejects unauthenticated writes.
- Recommendations: Add `VITE_BLOG_API_KEY` (or similar) for editor builds. Pass it in fetch headers. Never expose in client bundles for public routes — editors should be behind auth or used only in dev. Alternatively, run editors only when server is on localhost with a dev-only bypass.

**Rate limit in-memory:**
- Issue: `server.js` uses `rateLimitMap = new Map()` keyed by `req.ip`. In multi-instance or serverless deployments, each instance has its own map. Rate limiting does not aggregate across instances.
- Files: `server.js` (lines 46–63)
- Impact: Distributed traffic can exceed intended limits. Restarts clear the map.
- Recommendations: For production at scale, use Redis or similar for rate limit state. For single-instance, document the limitation.

**Secrets in bot/.env:**
- Issue: `bot/.env` holds API keys (OpenRouter, Reddit, Amazon, etc.). `.gitignore` includes `bot/.env`, but the project is not a git repo. If git is initialized without care, secrets could be committed.
- Files: `bot/.env`, `.gitignore`
- Recommendations: Rotate any exposed keys. Add pre-commit hook or git-secrets to block credential patterns. Use a secrets manager or env vars for production.

## Performance Bottlenecks

**Full blog load for listing:**
- Issue: `blog-posts.json` contains full article content. Blog listing fetches the entire file. With many posts, this grows linearly.
- Files: `public/blog-posts.json`, `scripts/build-blog.js`, `src/blog/BlogHome.tsx`, `src/blog/utils/blogUtils.ts`
- Cause: Single JSON file as both index and content store.
- Improvement path: Split into index (metadata only) and per-post files. Implement pagination or lazy loading for the listing.

**ProductSelector fetches on every category change:**
- Issue: `ProductSelector` filters `products` (currently empty) in `useEffect` when `selectedCategory` changes. When wired to `fetchAffiliateProducts()`, repeated category switches could trigger redundant fetches.
- Files: `src/blog/components/ProductSelector.tsx`
- Improvement path: Fetch once, cache in state or module. Filter client-side.

## Fragile Areas

**LocalEditor toast via raw DOM:**
- Issue: LocalEditor creates toasts with `document.createElement`, `innerHTML`, `appendChild`, `setTimeout` to remove. The app has `ToastProvider` and `useToast` used by `BlogPost` and others.
- Files: `src/blog/LocalEditor.tsx` (lines 183–206, 254–276, 384–402, 812–832), `src/components/Toast.tsx`
- Why fragile: Bypasses React. Toasts not integrated with provider. Duplicated toast markup and timing.
- Safe modification: Replace with `useToast()` and `showToast(message, 'success'|'error')`. Remove manual DOM manipulation.

**Build script runs asynchronously after response:**
- Issue: `server.js` calls `runBuildBlog()` after POST/DELETE. Uses `execFile` with callback — does not await. Response is sent before build completes.
- Files: `server.js` (lines 67–73, 114, 230)
- Impact: Client receives success while `blog-posts.json` may still be stale. Build failures only logged.
- Safe modification: Await build (or use `execFileSync`) before sending response, or return 202 and document eventual consistency.

**Import/export in LocalEditor has no validation:**
- Issue: `handleImportPosts` parses JSON and calls `savePost` for each item. No schema validation. Malformed or partial posts could be written.
- Files: `src/blog/LocalEditor.tsx` (lines 360–407)
- Safe modification: Validate against `BlogPost` shape before saving. Reject or skip invalid entries.

## Test Coverage Gaps

**No tests:**
- Issue: No `*.test.*`, `*.spec.*`, or test framework configured. No Jest, Vitest, or pytest setup.
- Files: (none)
- Risk: Regressions only caught manually. Critical paths (slug validation, markdown parsing, dedup logic) untested.
- Priority: High. Start with: `server.js` slug validation and auth, `scripts/build-blog.js` markdown parsing, `blogUtils` fetch/fallback logic.

## Dependencies at Risk

**react-beautiful-dnd archived:**
- Risk: Library archived by Atlassian. No React 19 support. No security patches.
- Files: `package.json`
- Impact: Will break on React upgrade.
- Migration plan: Replace with `@hello-pangea/dnd` (maintained fork, drop-in compatible) or `@dnd-kit/core`.

## Bot Pipeline (Python)

**AI pipeline cost and rate limits:**
- Issue: Each article uses multiple LLM calls (writer, refiner, editor). OpenRouter free tier has ~20 req/min, ~200/day. With 3 articles/run and retries, a run can exhaust a large share of the daily limit.
- Files: `bot/config.py`, `bot/ai_writer.py`, `bot/ai_refiner.py`, `bot/ai_editor.py`
- Impact: Runs fail when rate limited. No spend tracking if routed to paid models.
- Fix approach: Track remaining rate limit. Reduce `ARTICLES_PER_RUN` for free tier. Add cost/spend logging.

**No process locking:**
- Issue: Nothing prevents two scheduler instances from running (e.g. cron overlap). Both would read/write `seen_posts.db`, JSON files, and git concurrently.
- Files: `bot/scheduler.py`, `bot/scraper.py`, `bot/image_fetcher.py`
- Impact: Duplicate articles, corrupt JSON, git conflicts.
- Fix approach: PID lockfile at start of `run_pipeline()`. Bail if another instance is running.

## Missing Critical Features

**Editor auth flow:**
- Problem: Editors at `/blog/editor` and `/blog-editor` can call save/delete, but client never sends API key. Without a way to inject `BLOG_API_KEY` into the frontend (or a proxy that adds the header), editors cannot persist changes in production.
- Blocks: Production use of in-browser editors for authenticated users.

---

*Concerns audit: 2026-02-28*
