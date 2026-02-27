---
phase: 05-frontend-resilience
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ErrorBoundary.tsx
  - src/components/Toast.tsx
  - src/main.tsx
  - src/blog/BlogPost.tsx
  - src/blog/utils/blogUtils.ts
  - package.json
autonomous: true

must_haves:
  truths:
    - "A rendering crash in a blog post does not white-screen the entire page"
    - "Copying a blog link shows an inline toast notification instead of a browser alert"
    - "API_URL is configurable via VITE_API_URL environment variable with localhost fallback"
    - "Editor routes (LocalEditor, AdvancedBlogEditor) are code-split and not in the main bundle"
    - "@types packages are in devDependencies, not dependencies"
  artifacts:
    - path: "src/components/ErrorBoundary.tsx"
      provides: "Reusable React error boundary (class component)"
      contains: "componentDidCatch"
    - path: "src/components/Toast.tsx"
      provides: "Toast notification system with context + hook"
      exports: ["ToastProvider", "useToast"]
    - path: "src/main.tsx"
      provides: "Route wiring with ErrorBoundary wrapping and lazy-loaded editors"
      contains: "React.lazy"
    - path: "src/blog/utils/blogUtils.ts"
      provides: "Configurable API_URL via import.meta.env"
      contains: "import.meta.env.VITE_API_URL"
  key_links:
    - from: "src/main.tsx"
      to: "src/components/ErrorBoundary.tsx"
      via: "import and JSX wrapping of route elements"
      pattern: "ErrorBoundary"
    - from: "src/main.tsx"
      to: "src/blog/LocalEditor.tsx"
      via: "React.lazy dynamic import"
      pattern: "React\\.lazy.*LocalEditor"
    - from: "src/blog/BlogPost.tsx"
      to: "src/components/Toast.tsx"
      via: "useToast hook call"
      pattern: "useToast"
---

<objective>
Add error boundaries, replace alert() with toast notifications, make API_URL configurable, lazy-load editor components, and clean up dependency categorization.

Purpose: Prevent white-screen crashes, improve UX feedback patterns, enable environment-based configuration, reduce bundle size for readers, and fix package.json hygiene.
Output: ErrorBoundary and Toast components, updated routing with code splitting, configurable API, clean devDependencies.
</objective>

<execution_context>
@~/.cursor/get-shit-done/workflows/execute-plan.md
@~/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@src/main.tsx
@src/blog/BlogPost.tsx
@src/blog/BlogHome.tsx
@src/blog/utils/blogUtils.ts
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ErrorBoundary and Toast components</name>
  <files>
    src/components/ErrorBoundary.tsx
    src/components/Toast.tsx
  </files>
  <action>
    **ErrorBoundary (src/components/ErrorBoundary.tsx):**

    Create a reusable React class component (React error boundaries MUST be class components — there is no hook equivalent).

    Props interface:
    - `children: React.ReactNode`
    - `fallback?: React.ReactNode` (optional custom fallback UI)

    State: `{ hasError: boolean; error: Error | null }`

    Required lifecycle methods:
    - `static getDerivedStateFromError(error: Error)` — sets hasError to true, captures error
    - `componentDidCatch(error: Error, errorInfo: React.ErrorInfo)` — logs to console.error
    - `render()` — if hasError, show fallback UI; otherwise render children

    Default fallback UI: a centered card with "Something went wrong" heading, the error message in a muted/smaller text, and a "Try Again" button that resets state to `{ hasError: false, error: null }`. Style with Tailwind (the project uses Tailwind). Keep it minimal — dark background card consistent with the blog's dark theme (bg-gray-900, text-white).

    Export as both default and named export.

    **Toast (src/components/Toast.tsx):**

    Create a zero-dependency toast notification system using React context. No external libraries.

    Components to export:
    1. `ToastProvider` — wraps app, manages toast state via useState. Renders children + a fixed-position toast container (bottom-right, `fixed bottom-4 right-4 z-50`).
    2. `useToast` hook — returns `{ showToast: (message: string, type?: 'success' | 'error' | 'info') => void }`.

    Toast behavior:
    - Shows a small notification pill/card with the message
    - Auto-dismisses after 3 seconds
    - Supports stacking (multiple toasts visible, newest at bottom)
    - Animate in with a simple CSS transition (translate-y + opacity, use Tailwind `transition-all duration-300`)
    - Type determines accent color: success=green-500, error=red-500, info=blue-500
    - Each toast has a unique id (Date.now() or incrementing counter) for proper list keying

    Style with Tailwind. Dark theme: bg-gray-800, text-white, rounded-lg, shadow-lg, px-4 py-3. Left border colored by type (border-l-4).
  </action>
  <verify>
    - `npx tsc --noEmit` passes with no errors related to ErrorBoundary.tsx or Toast.tsx
    - ErrorBoundary.tsx exports a class component with `componentDidCatch` and `getDerivedStateFromError`
    - Toast.tsx exports `ToastProvider` and `useToast`
  </verify>
  <done>
    ErrorBoundary.tsx exists as a class component with try-again reset. Toast.tsx exists with ToastProvider context and useToast hook. Both use Tailwind, no new dependencies added.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire components into app and fix configuration</name>
  <files>
    src/main.tsx
    src/blog/BlogPost.tsx
    src/blog/utils/blogUtils.ts
    package.json
  </files>
  <action>
    **main.tsx — Lazy-load editors + ErrorBoundary wrapping:**

    1. Remove the static imports of `LocalEditor` and `AdvancedBlogEditor` at the top.
    2. Add: `const LocalEditor = React.lazy(() => import('./blog/LocalEditor.tsx'))` and same for AdvancedBlogEditor.
    3. Import `ErrorBoundary` from `'./components/ErrorBoundary.tsx'` and `ToastProvider` from `'./components/Toast.tsx'`.
    4. Wrap the `<RouterProvider>` inside `<ToastProvider>` so toast is available app-wide.
    5. For the blog content routes (`/blog`, `/blog/:slug`), wrap their `element` values with `<ErrorBoundary>`. E.g. `element: <ErrorBoundary><BlogPost /></ErrorBoundary>`.
    6. For the editor routes (`/blog/editor`, `/blog-editor`, `/blog-editor/:slug`), wrap their elements with `<React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading editor...</div>}>`. Also wrap these in ErrorBoundary for consistency: `<ErrorBoundary><Suspense ...><LazyEditor /></Suspense></ErrorBoundary>`.
    7. Do NOT wrap the non-blog routes (/, /about, /terms-of-service, /privacy-policy) — those are simple pages that don't need it.

    **BlogPost.tsx — Replace alert() with toast:**

    1. Import `useToast` from `'../../components/Toast'`.
    2. Inside the BlogPost component function, add `const { showToast } = useToast();` near the top with other hooks.
    3. Find the copy-link button onClick handler at ~line 285-288. Replace:
       `alert('Link copied to clipboard!')` → `showToast('Link copied to clipboard!', 'success')`

    NOTE: Do NOT touch the alert() calls in LocalEditor.tsx — those are admin-only tools where alert() is acceptable.

    **blogUtils.ts — Make API_URL configurable:**

    Replace line 3:
    `const API_URL = 'http://localhost:3001/api';`
    with:
    `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';`

    One-line change. The fallback preserves existing behavior. Vite will inline the env var at build time.

    **package.json — Move @types to devDependencies:**

    Move these three packages from `dependencies` to `devDependencies`:
    - `@types/react-beautiful-dnd`: `^13.1.8`
    - `@types/three`: `^0.182.0`
    - `@types/uuid`: `^10.0.0`

    Remove them from `dependencies` and add them to `devDependencies` (preserving existing devDependencies). Maintain alphabetical ordering within each section.
  </action>
  <verify>
    - `npx tsc --noEmit` passes with no type errors
    - `npm run build` completes successfully (confirms lazy loading syntax is valid, no broken imports)
    - `grep -r "alert(" src/blog/BlogPost.tsx` returns zero matches
    - `grep "import.meta.env.VITE_API_URL" src/blog/utils/blogUtils.ts` returns a match
    - `grep "@types/three" package.json` appears only in devDependencies section
    - `grep "React.lazy" src/main.tsx` returns matches for both editor components
  </verify>
  <done>
    - ErrorBoundary wraps blog and editor routes in main.tsx
    - ToastProvider wraps the entire app in main.tsx
    - Editor components are lazy-loaded with React.lazy + Suspense
    - BlogPost.tsx uses showToast() instead of alert()
    - blogUtils.ts reads API_URL from VITE_API_URL with localhost fallback
    - @types/react-beautiful-dnd, @types/three, @types/uuid are in devDependencies
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no type errors introduced
2. `npm run build` — production build succeeds (validates lazy loading, imports, env var usage)
3. Manual spot check: `src/blog/BlogPost.tsx` has zero `alert(` calls
4. Manual spot check: `src/main.tsx` has `React.lazy` for both editor components
5. Manual spot check: `package.json` has all three @types in devDependencies only
6. Manual spot check: `src/blog/utils/blogUtils.ts` line 3 references `import.meta.env.VITE_API_URL`
</verification>

<success_criteria>
- ErrorBoundary component exists as a class component and wraps blog content + editor routes
- Toast system exists with context provider and hook; no alert() in BlogPost.tsx
- API_URL reads from VITE_API_URL env var with fallback to localhost:3001
- LocalEditor and AdvancedBlogEditor are lazy-loaded via React.lazy + Suspense
- @types/react-beautiful-dnd, @types/three, @types/uuid are in devDependencies
- `npm run build` passes clean
</success_criteria>

<output>
After completion, create `.planning/phases/05-frontend-resilience/05-01-SUMMARY.md`
</output>
