# Testing Patterns

**Analysis Date:** 2025-02-28

## Test Framework

**Runner:** Not configured

**Assertion Library:** Not present

**Run Commands:**
```bash
# No test script in package.json
npm run lint    # ESLint only
```

**Current state:** No Jest, Vitest, React Testing Library, or other test runner is installed. The project has no automated tests.

## Test File Organization

**Location:** Not applicable (no test files)

**Naming:** Not applicable

**Structure:** No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files found in the codebase.

## Manual Verification

**Smoke test script:** `scripts/test-changes.js`

- Purpose: Quick smoke test for Images & Amazon Product Overhaul changes
- Run: `node scripts/test-changes.js`
- Not wired into `package.json` scripts
- Checks:
  1. `blog-posts.json` exists (requires `npm run build:blog` first)
  2. Posts with inline images
  3. Posts with featured-product comments
  4. Amazon products limited to 3 per post
  5. Featured-product comment parsing (mirrors `MarkdownRenderer` logic)

**Example from `scripts/test-changes.js`:**
```javascript
const sampleComment = '<!-- featured-product: AMD Radeon RX 7800 XT | From £479 | ... -->';
const inner = sampleComment.replace(/^<!--\s*featured-product:\s*/, '').replace(/\s*-->$/, '').trim();
const parts = inner.split(/\s*\|\s*/).map((p) => p?.trim() || '');
// Assert parsed structure matches expected
```

## Recommended Test Setup

To add testing, use one of these approaches:

**Option A: Vitest (Vite-native)**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- Config in `vite.config.ts` or `vitest.config.ts`
- Co-locate tests: `Component.tsx` + `Component.test.tsx`, or use `__tests__/` directory

**Option B: Jest**
```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

- Add `jest.config.js` with `transform` for TypeScript
- Add `"test": "jest"` to `package.json` scripts

## What to Test (When Tests Are Added)

**High-value units:**
- `src/blog/utils/markdownUtils.ts`: `parseMarkdownToBlogPost`, `parseContentToBlocks`, `formatBlogPostToMarkdown`, `generateMarkdownFromBlocks`
- `src/blog/utils/blogUtils.ts`: `getRelatedPostsByTopic`, `formatPublishDate`, `calculateReadingTime`
- `src/blog/data/tagHierarchy.ts`: `isDisplayableTag`, `isMainGroup`, `getMainGroupForTag`

**Component candidates:**
- `MarkdownRenderer`: featured-product parsing, markdown rendering
- `BlockRenderer`: block type switching
- `ErrorBoundary`: error state and reset
- `Toast` / `useToast`: show/hide behavior

**Integration:**
- Blog post fetch + render flow
- Editor save/load with `blogUtils` and `markdownUtils`

## Mocking (When Tests Are Added)

**What to mock:**
- `fetch` for API calls (`blogUtils`, `getPostBySlug`, etc.)
- `react-router-dom` (`useParams`, `useNavigate`, `Link`) in component tests
- `useToast` when testing components that show toasts

**What NOT to mock:**
- Pure utils (`formatPublishDate`, `calculateReadingTime`, `parseContentToBlocks`)
- Type definitions and data structures

## Coverage

**Requirements:** None enforced

**View coverage:** N/A until a test runner is configured

---

*Testing analysis: 2025-02-28*
