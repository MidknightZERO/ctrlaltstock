# Testing Patterns

**Analysis Date:** 2025-03-01

## Test Framework

**Frontend:**
- **Runner:** Not configured. No Vitest, Jest, or Playwright in `package.json`. Vite is used for build (`vite.config.ts`); no test runner in Vite config.
- **Config:** No `vitest.config.*`, `jest.config.*`, or `playwright.config.*` in the repo.
- **Run commands:** No `test` or `test:watch` scripts in `package.json`. Only `lint` (eslint) and build/preview scripts.

**Bot (Python):**
- **Runner:** Not configured. No pytest, unittest, or tox. No `tests/` directory, no `pytest.ini`, no `conftest.py`.
- **Run commands:** No test script in `bot/requirements.txt` or repo root; bot is run via `python bot/<script>.py` for production/cron.

## Test File Organization

**Location:** Not applicable — no test files found.

**Naming:** No `*.test.*`, `*.spec.*`, or `test_*.py` files in the codebase.

**Structure:** N/A.

## Test Structure

No test suites present. The only validation script is a build/smoke script:

- **`scripts/test-changes.js`** — Manual smoke test for "Images & Amazon Product Overhaul". Run: `node scripts/test-changes.js`. It:
  1. Loads `public/blog-posts.json` (fails if missing).
  2. Counts posts with inline markdown images and featured-product comments.
  3. Checks `amazonProducts` length ≤ 3 per post.
  4. Asserts parsing of a sample `<!-- featured-product: ... -->` comment (mirrors `MarkdownRenderer`).
  5. Exits with `process.exit(1)` on failure; no test framework.

This is **build/output validation**, not a unit or integration test suite.

## Mocking

**Framework:** None in use; no tests to mock from.

**Recommendation (from existing codebase map):** When tests are added, mock external services in bot (OpenRouter, Unsplash, Pexels, Reddit, RSS, NewsAPI, Groq) and in frontend (API/data fetchers) so tests don't hit real APIs.

## Fixtures and Factories

No test fixtures or factories. Bot uses real paths and config (`config.git.repo_path`, `config.bot.posts_dir`, `bot/.tmp/`, `bot/used_images.json`). Frontend uses real `public/blog-posts.json` in the smoke script.

## Coverage

**Requirements:** None enforced. No coverage tool (c8, nyc, pytest-cov) configured.

**View coverage:** N/A.

## Test Types

**Unit tests:** None.

**Integration tests:** None.

**E2E tests:** None. No Playwright, Cypress, or similar.

**Smoke / build validation:** `scripts/test-changes.js` only; not wired into `npm test`.

## Common Patterns (When Adding Tests)

**Bot (Python) — suggested:**
- Use **pytest** for bot. Place tests in `bot/tests/` or repo-root `tests/` with modules mirroring `bot/` (e.g. `test_backfill_content.py`, `test_scraper.py`, `test_image_fetcher.py`).
- Critical paths to cover first (per CONCERNS.md): `scraper.py` dedup (`is_seen`, `normalize_string`, `similarity_to_existing`), `backfill_content.py` link/phrase logic, `image_fetcher.py` pool selection and anti-reuse.
- Use fixtures for: minimal `config` overrides, temp dir for posts and `used_images.json`, in-memory SQLite for `seen_posts`. Mock `httpx`, `praw`, and AI/vision APIs.
- Run from repo root: `pytest bot/tests -v` (or `tests/` if structured that way).

**Frontend (TypeScript/React) — suggested:**
- Use **Vitest** (Vite-native). Add `vitest` and `@testing-library/react` (and optionally `jsdom`). Config in `vite.config.ts` or `vitest.config.ts`.
- Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`, or use a `__tests__` folder under `src/`.
- Test: `blogUtils` (getPostBySlug, getAllPosts, parsing), slug/validation in `server.js`, and any shared markdown/featured-product parsing used by `MarkdownRenderer` and `scripts/test-changes.js`.
- Mock: `blogUtils` / API in component tests; use Vitest's `vi.mock()` for modules.

**Shared:**
- Reuse the same featured-product parsing expectations as `scripts/test-changes.js` in a unit test so the contract is in one place.

## Gaps and Priority

| Area | What's not tested | Risk | Priority |
|------|-------------------|------|----------|
| Scraper dedup | `is_seen`, `normalize_string`, similarity vs existing posts | Duplicate or missed stories | High |
| Backfill links | Phrase matching, max links, distribution-aware logic | Wrong/missing links, skew | High |
| Image fetcher | Pool selection, anti-reuse, used_images update | Reused or wrong images | High |
| build-blog.js | Markdown/frontmatter parsing, blog-posts.json shape | Broken build or wrong UI data | High |
| server.js | Slug validation, routes | 404 or wrong post | Medium |
| blogUtils | getPostBySlug, getAllPosts, related posts | Wrong data on blog pages | Medium |
| React components | BlogPost, BlogHome, MarkdownRenderer | Regressions in UI | Lower until critical paths covered |

---

*Testing analysis: 2025-03-01*
