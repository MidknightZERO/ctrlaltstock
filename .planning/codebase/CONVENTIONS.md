# Coding Conventions

**Analysis Date:** 2025-03-01

## Naming Patterns

**Files:**
- **Frontend (TS/TSX):** PascalCase for components (e.g. `BlogPost.tsx`, `MarkdownRenderer.tsx`), camelCase for utilities (e.g. `blogUtils.ts`, `markdownUtils.ts`). Data modules use camelCase: `productData.ts`, `blogUtils.ts`, `pillarPosts.ts`.
- **Bot (Python):** snake_case modules: `backfill_content.py`, `image_fetcher.py`, `fix_affiliate_images.py`, `validate_existing_content.py`. Directives in `bot/directives/` use kebab-case filenames: `image_sourcing.md`, `scrape.md`, `write.md`.

**Functions:**
- **Python:** snake_case. Fix/action functions return `bool` for “changed” (e.g. `fix_tags(post) -> bool`, `add_links_to_post(...) -> bool`). Loaders return data or empty fallback: `load_posts()`, `load_validation_report()`, `_load_used_images()`.
- **TypeScript:** camelCase for functions; PascalCase for React components and exported interfaces/types (e.g. `getPostBySlug`, `BlogPost`, `ArticleQuizProps`).

**Variables:**
- **Python:** snake_case. Constants in UPPER_SNAKE at module level: `SITE_BASE_URL`, `VALIDATION_REPORT_PATH`, `USED_IMAGES_MAX`, `SIMILARITY_THRESHOLD`.
- **TypeScript:** camelCase; UPPER_SNAKE for true constants (e.g. `DUPLICATED` in `CommunityTestimonialsScroller.tsx`).

**Types:**
- **Python:** Type hints on public functions: `Dict[str, Any]`, `List[Tuple[Path, fm.Post]]`, `Optional[Dict[str, Any]]`. Dataclasses in `config.py` for config objects.
- **TypeScript:** Exported interfaces with PascalCase: `BlogPost`, `ArticleQuizProps`, `BlogHeroProps`. Types in `src/types.d.ts` or co-located.

## Code Style

**Formatting:**
- **Frontend:** No Prettier config detected; ESLint via `eslint.config.js`. TypeScript strict via `tsconfig.app.json`.
- **Bot:** No formatter config (black/ruff) in repo; 4-space indent, line length not strictly enforced.

**Linting:**
- **Frontend:** ESLint 9 with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Rules: `react-refresh/only-export-components` (warn, allowConstantExport). Run: `npm run lint` (eslint .). Ignores: `dist`.
- **Bot:** No lint config in repo (no pylint/ruff/flake8).

## Import Organization

**Frontend:**
1. React and hooks first: `import React, { useEffect, useState } from 'react';`
2. Third-party (react-router, lucide-react, etc.)
3. Local components and utils: `import Layout from '../components/Layout';`, `import { getPostBySlug, getAllPosts } from './utils/blogUtils';`
4. Types: `import type { BlogPost } from '../types';` or from local modules

**Path aliases:** No path aliases in `tsconfig.app.json`; relative imports (`../`, `./`) used throughout `src/`.

**Bot (Python):**
1. Standard library (json, re, sys, argparse, pathlib, logging, etc.)
2. Third-party (frontmatter, httpx, tenacity, praw, feedparser, etc.)
3. Local: `import config`, `from utils import infer_primary_topic`, `from image_fetcher import fetch_images`. Bot scripts prepend `_BOT_DIR` to `sys.path` when run as main: `sys.path.insert(0, str(_BOT_DIR))`.

## Error Handling

**Bot (Python):**
- **Log and return fallback:** Loaders catch exceptions, log with `log.warning`/`log.error`, return empty dict/list: `load_validation_report()`, `load_fix_list()`, `_load_stock_images()`, `load_posts()` in backfill/generate_fix_list/validate_existing.
- **Retries:** External HTTP via `tenacity`: `@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))` in `scraper.py` and `image_fetcher.py`.
- **Publish flow:** `publish()` in `publisher.py` wraps write → build:blog → git → hook in try/except; logs with `exc_info=True`, notifies Discord, returns `False`.
- **CLI:** Scripts use `sys.exit(0)` or `sys.exit(1)`; argparse for invalid args. `hero_validate.py` returns 0 even when `suitable` is False so caller decides.

**Frontend:**
- **Async:** `blogUtils.ts` uses try/catch in async functions; failures surface as null/false (e.g. `getPostBySlug` returns `null`). No global error boundary pattern documented in sampled files.
- **Build validation:** `scripts/test-changes.js` uses `process.exit(1)` on failure; synchronous checks (blog-posts.json exists, featured-product parsing).

## Logging

**Bot:**
- **Framework:** `logging` stdlib. Pattern: `logging.getLogger(__name__)` after `logging.basicConfig` (or module-level handlers). Format: `"%(asctime)s [%(name)s] %(levelname)s %(message)s"` (or `[image_fetcher]` / `[validate_existing]` in handler).
- **Handlers:** Rotating file handlers in `config.bot.logs_dir` (e.g. `backfill.log`, `scraper.log`, `publish.log`) with `maxBytes=10_000_000`, `backupCount=3`, plus `StreamHandler`.
- **When to log:** INFO for progress (e.g. “Updated cover images: %s”, “Added links: %s”); WARNING for recoverable failures (missing file, parse error); ERROR for publish/scrape failures. Debug via `log.debug` where used.

**Frontend:** No shared logging abstraction; `console.log`/`console.error` in scripts (e.g. `test-changes.js`).

## Comments

**When to comment:**
- **Bot:** Docstrings on public functions (one-line or multi-line). Module docstrings describe purpose, usage, and CLI examples. Inline comments for non-obvious logic (e.g. dedup, word-boundary rules in `validate_existing_content.py`).
- **Frontend:** JSDoc not consistently used; occasional inline comments. Component props often documented via `export interface XProps`.

**Docstrings (Python):** First line summary; “Returns True if changed” for fix functions. Usage examples in module docstring (e.g. `backfill_content.py`, `image_fetcher.py`, `scraper.py`).

## Function Design

**Bot:**
- **Size:** Single-purpose helpers; larger orchestration in `run_backfill()`, `get_best_story()`, `fetch_images()`.
- **Parameters:** Required positional or keyword; optional with defaults (`dry_run: bool = False`, `max_links: int = 5`). Typed.
- **Return values:** Fix functions return `bool` (changed). Loaders return data or empty. `run_backfill` returns tuple of counts; `get_best_story` returns `Optional[Dict]`.

**Frontend:** Components receive props objects; hooks return state and handlers. Async data functions return `Promise<T | null>` or `Promise<boolean>`.

## Module Design

**Exports:** TypeScript: default export for pages/components; named exports for utils and types. Python: no `__all__`; public functions used by other bot scripts or CLI.

**Barrel files:** Not used; direct imports from `blogUtils`, `productData`, etc.

---

## Bot-specific: Idempotency, Duplicate Checks, Image Guarantees

**Idempotency and dry-run:**
- **dry_run:** Bot scripts that mutate state support `--dry-run`: no file writes, no DB “mark seen”, no git push. Used in: `backfill_content.py`, `scraper.py`, `fix_affiliate_images.py`, `generate_fix_list.py`, `scheduler.py`, `publisher.py`, `reprocess_rejected.py`, `resume_draft.py`. When `dry_run=True`, scripts log what would be done and skip all persistence.
- **Idempotent fixes:** Backfill fix functions are designed to be re-runnable: they check current state and only change when needed (e.g. empty tags, missing excerpt, link count below max). They return “changed” and callers only call `fm.dump(post, path)` when `changed and not dry_run`.

**Duplicate checks:**
- **Scraper:** SQLite `seen_posts` table in `bot/seen_posts.db`: primary key on `id`; `norm_title` for normalized title dedup. `is_seen(db, post_id, title)` checks both. `mark_seen()` only when not dry_run. Within-run dedup: `similarity_between()` and `WITHIN_RUN_SIMILARITY_THRESHOLD` so the same batch doesn’t return two very similar stories. Cross-run: `similarity_to_existing()` vs `blog-posts.json` (last 7 days) to avoid re-covering same topic.
- **Backfill:** Phrase-based link insertion uses `used_phrases` per article so each phrase links at most once. Internal links: `existing_count >= max_links` skips adding more. Amazon links: same pattern; `mark_used(phrase)` also marks overlapping phrases to avoid double-linking.
- **Images:** `image_fetcher.py`: `used_images.json` (last 50 URLs); `_load_recent_cover_images(days)` from `blog-posts.json` (default 7 days). Picks “least recently used” from pool; dedup by base URL (`base = url.split("?")[0]`) so same image isn’t added twice. `fetch_images()` ensures at least one cover and up to a few images; updates `used_images.json` after selection.

**Image-per-article guarantees:**
- **Directive:** `bot/directives/image_sourcing.md` defines priority: Amazon product images → Unsplash/search → stock catalogue. Anti-reuse: `used_images.json` + recent cover images from blog-posts (configurable `image_reuse_lookback_days`).
- **Cover + body:** `fetch_images()` sets `coverImage` and `images` (slices 1:4). Backfill `--images-only` re-fetches cover (and images) per post using `fix_list` search queries when available; otherwise topic-aware stock/API. Inline images added in `backfill_content.py` via `add_inline_images_to_post` (after every 2nd H2/H3, max 3); cover is stripped from trailing position if duplicated.
- **Validation:** `validate_existing_content.py` writes `validation-report.json` with `image_relevance_ok` and `image_message` per post (heuristic: topic vs cover URL). Backfill uses the report for distribution-aware linking, not for forcing image replacement.

**Convention summary for bot scripts:**
- Support `--dry-run` for any script that writes files or DB.
- Fix/transform functions return `bool` (changed) and avoid redundant writes.
- Dedup: DB + normalized title for scraper; per-article phrase sets for links; used-images + recent-covers for images.
- Image selection: topic-aware pool, exclude recent covers, update `used_images.json`, dedupe by base URL.

---

*Convention analysis: 2025-03-01*
