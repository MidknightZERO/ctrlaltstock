# Coding Conventions

**Analysis Date:** 2025-02-28

## Naming Patterns

**Files:**
- Components: PascalCase (e.g. `BlogPost.tsx`, `ErrorBoundary.tsx`, `MarkdownRenderer.tsx`)
- Utilities/data: camelCase (e.g. `blogUtils.ts`, `markdownUtils.ts`, `productData.ts`)
- Types: `types.ts` at `src/types.ts`

**Functions:**
- camelCase for functions (e.g. `getAllPosts`, `formatPublishDate`, `parseMarkdownToBlogPost`)
- PascalCase for React components (e.g. `BlogPost`, `Layout`, `BlockRenderer`)

**Variables:**
- camelCase for variables and constants (e.g. `blogPosts`, `cachedPosts`, `DISCORD_INVITE`)
- UPPER_SNAKE_CASE for module-level constants (e.g. `API_URL`, `MAIN_GROUPS`, `COVER_IMAGE_FALLBACK`)

**Types:**
- PascalCase for interfaces and types (e.g. `BlogPost`, `ContentBlock`, `LayoutProps`)
- Suffix props interfaces with `Props` (e.g. `BlockRendererProps`, `MarkdownRendererProps`)

## Code Style

**Formatting:**
- No Prettier config detected; rely on editor defaults or manual formatting
- Semicolons used consistently in TypeScript/TSX
- Double quotes for strings in most places; single quotes in some imports

**Linting:**
- ESLint 9.x with flat config (`eslint.config.js`)
- Extends: `@eslint/js` recommended, `typescript-eslint` recommended
- Plugins: `react-hooks`, `react-refresh`
- Key rules: `react-hooks/rules-of-hooks`, `react-refresh/only-export-components` (warn)
- Target: `**/*.{ts,tsx}`; ignores `dist`

## Import Organization

**Order:**
1. React (and hooks)
2. Third-party libraries (react-router-dom, lucide-react, etc.)
3. Local components (relative paths)
4. Utils/data (relative paths)
5. Types (`import type` when type-only)
6. Assets (images)

**Path style:**
- Relative paths only; no path aliases in `tsconfig.app.json`
- Use `../` and `./` for traversal
- Some files use `.tsx` extension in imports (e.g. `main.tsx`); others omit it

**Type imports:**
- Mix of `import { BlogPost } from '../types'` and `import type { BlogPost } from '../types'`
- Some files use `../types.d` (e.g. `BlogPost.tsx`, `BlockRenderer.tsx`, `LocalEditor.tsx`); prefer `../types` for consistency

## Error Handling

**Patterns:**
- Async API calls: try/catch with `console.error` and fallback return (e.g. `[]`, `null`, `false`)
- React components: `ErrorBoundary` wraps route-level components (`main.tsx`)
- User-facing errors: `error` state + inline error UI (e.g. `BlogPost.tsx` "Error Loading Post")
- Image load failures: `onError` handler sets `src` to `/Logo.png` fallback

**Example from `src/blog/utils/blogUtils.ts`:**
```typescript
try {
  const response = await fetch(`${API_URL}/posts`);
  if (response && response.ok) {
    const posts = await response.json();
    updateCache(posts);
    return posts;
  }
  // Fallback to static JSON...
  return [];
} catch (error) {
  console.error('Error fetching blog posts:', error);
  return [];
}
```

**Example from `src/components/ErrorBoundary.tsx`:**
- Class component with `getDerivedStateFromError` and `componentDidCatch`
- Renders fallback UI or custom `fallback` prop; "Try Again" button resets state

## Logging

**Framework:** `console` only

**Patterns:**
- `console.error` for caught errors in utils and components
- `console.warn` for non-fatal issues (e.g. `markdownUtils.ts` content blocks not array)
- `log()` helper in `blogUtils.ts`: `console.log(\`[blogUtils] ${msg}\`)` for debug

**When to log:**
- API failures, parse errors, unexpected data shapes
- Avoid logging in hot paths; no structured logging service

## Comments

**When to comment:**
- JSDoc for exported utility functions (e.g. `parseMarkdownToBlogPost`, `getRelatedPostsByTopic`)
- Section comments in JSX: `{/* Hero Section */}`, `{/* Post Content */}`
- Inline comments for non-obvious logic (e.g. fallback chains, regex parsing)

**JSDoc/TSDoc:**
- Used in `markdownUtils.ts` for params and return values
- Format: `@param`, `@returns` where helpful

## Function Design

**Size:**
- Components vary; some are large (e.g. `App.tsx` ~310 lines, `BlogPost.tsx` ~400 lines)
- Utils: small, single-purpose functions preferred

**Parameters:**
- Props interfaces for components; destructure in signature
- Optional params with defaults (e.g. `limit: number = 4` in `getRelatedPostsByTopic`)

**Return values:**
- Async utils return `Promise<T>` or `Promise<T | null>`; sync utils return `T`
- Boolean for success/failure (e.g. `savePost`, `deletePost`)

## Module Design

**Exports:**
- Default export for page/route components (e.g. `export default App`)
- Named exports for utilities, hooks, and shared components (e.g. `useToast`, `ToastProvider`, `getAllPosts`)
- Some components use both: `export const X` + `export default X` (e.g. `CommunityTestimonialsScroller`)

**Barrel files:**
- Not used; direct imports from source files

## React Conventions

**Component typing:**
- `React.FC` or `React.FC<Props>` for all functional components
- Props interfaces defined above or beside component

**Hooks:**
- `useState`, `useEffect`, `useCallback`, `useContext`, `useParams`, `useNavigate`, `useLocation`, `useMemo`
- Custom hook: `useToast` throws if used outside provider

**Context:**
- `ToastProvider` + `useToast` for toast notifications
- No other app-wide context

**Lazy loading:**
- `LocalEditor` and `AdvancedBlogEditor` loaded via `React.lazy()` with `Suspense` fallback

---

*Convention analysis: 2025-02-28*
