---
phase: 01-security-server-hardening
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [server.js, .env]
autonomous: true

must_haves:
  truths:
    - "Path traversal via slug is blocked — requests with /, .., or non-alphanumeric-dash chars return 400"
    - "Unauthenticated POST and DELETE requests are rejected with 403"
    - "CORS only allows origins localhost:5173 and ctrlaltstock.com"
    - "Shell injection surface eliminated — exec() replaced with execFile()"
    - "Error responses never contain stack traces or internal error messages"
    - "Excessive requests from a single IP return 429"
    - "No hardcoded fallback posts are served"
  artifacts:
    - path: "server.js"
      provides: "Hardened Express dev server"
      contains: "execFile"
    - path: ".env"
      provides: "API key for auth middleware"
      contains: "BLOG_API_KEY"
  key_links:
    - from: "server.js auth middleware"
      to: "POST /api/posts, DELETE /api/posts/:slug"
      via: "middleware function checking Authorization header against BLOG_API_KEY"
      pattern: "req\\.headers\\.authorization"
    - from: "server.js slug validation"
      to: "GET /api/posts/:slug, DELETE /api/posts/:slug"
      via: "regex test before path.join"
      pattern: "/\\^\\[a-z0-9-\\]\\+\\$/"
    - from: "server.js rate limiter"
      to: "app.use"
      via: "in-memory per-IP counter middleware"
      pattern: "429"
---

<objective>
Harden server.js against all identified security vulnerabilities: path traversal, missing auth, open CORS, shell injection, stack trace leaks, and missing rate limiting. Remove dead fallback post code.

Purpose: The dev server has file-write access on the developer's machine. Even though it's development-only, these vulnerabilities create real risk — path traversal could read/delete arbitrary files, and exec() opens a shell injection surface.

Output: A secure server.js and .env file with API key.
</objective>

<execution_context>
@~/.cursor/get-shit-done/workflows/execute-plan.md
@~/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@server.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add security infrastructure — middleware, helpers, config</name>
  <files>server.js, .env</files>
  <action>
  Modify the top of server.js:

  1. **Replace import:** Change `import { exec } from 'child_process'` to `import { execFile } from 'child_process'`.

  2. **Load env var:** After the `const PORT` line, read the API key:
     ```
     const BLOG_API_KEY = process.env.BLOG_API_KEY;
     if (!BLOG_API_KEY) {
       console.error('FATAL: BLOG_API_KEY environment variable is not set');
       process.exit(1);
     }
     ```

  3. **Restrict CORS:** Replace `app.use(cors())` with:
     ```
     app.use(cors({
       origin: ['http://localhost:5173', 'https://ctrlaltstock.com']
     }));
     ```

  4. **Add slug validation helper** (before routes):
     ```
     const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
     function isValidSlug(slug) {
       return typeof slug === 'string' && slug.length > 0 && slug.length <= 200 && SLUG_PATTERN.test(slug);
     }
     ```
     This rejects empty strings, strings over 200 chars, and anything containing `/`, `..`, spaces, or uppercase. The pattern only allows lowercase alphanumeric segments joined by single hyphens (no leading/trailing/double hyphens).

  5. **Add API key auth middleware** (before routes):
     ```
     function requireAuth(req, res, next) {
       const provided = req.headers.authorization?.replace('Bearer ', '');
       if (provided !== BLOG_API_KEY) {
         return res.status(403).json({ error: 'Forbidden' });
       }
       next();
     }
     ```
     Apply to mutating routes only: `app.post('/api/posts', requireAuth, async ...)` and `app.delete('/api/posts/:slug', requireAuth, async ...)`. Do NOT apply to GET routes (reads are safe for dev).

  6. **Add in-memory rate limiter** (before routes, no new npm packages):
     ```
     const rateLimitMap = new Map();
     const RATE_LIMIT_WINDOW_MS = 60 * 1000;
     const RATE_LIMIT_MAX = 30;

     function rateLimit(req, res, next) {
       const ip = req.ip;
       const now = Date.now();
       const record = rateLimitMap.get(ip);
       if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
         rateLimitMap.set(ip, { windowStart: now, count: 1 });
         return next();
       }
       record.count++;
       if (record.count > RATE_LIMIT_MAX) {
         return res.status(429).json({ error: 'Too many requests' });
       }
       next();
     }
     ```
     Apply globally: `app.use(rateLimit)` (place after CORS, before routes).

  7. **Delete the fallback functions entirely:** Remove `createFallbackPosts()` (lines 133-164) and `getFallbackPostBySlug()` (lines 166-169). These serve hardcoded 2023 data for posts that exist as real .md files.

  8. **Create .env file** with a generated random API key:
     ```
     BLOG_API_KEY=blog-dev-XXXXXXXXXXXX
     ```
     Generate XXXXXXXXXXXX as 24 random hex chars. This is a dev-only key.

  </action>
  <verify>
  - `node -e "import('./server.js')"` should fail with "FATAL: BLOG_API_KEY" (proving env var check works)
  - Grep server.js: no `exec(` calls remain (only `execFile`)
  - Grep server.js: no `createFallbackPosts` or `getFallbackPostBySlug` references remain
  - Grep server.js: `cors({` with origin array present
  - Grep server.js: `requireAuth` middleware applied to POST and DELETE routes
  - Grep server.js: `rateLimit` applied globally
  - .env file exists with BLOG_API_KEY set
  </verify>
  <done>
  server.js has CORS restricted, auth middleware defined and applied, rate limiter active, slug validator ready, exec import replaced with execFile, fallback posts deleted, and .env created with API key.
  </done>
</task>

<task type="auto">
  <name>Task 2: Harden route handlers — slug validation, execFile, error sanitization</name>
  <files>server.js</files>
  <action>
  Modify each route handler in server.js:

  1. **POST /api/posts** — Replace `exec('npm run build:blog', ...)` with:
     ```
     execFile('npm', ['run', 'build:blog'], (error, stdout, stderr) => {
       if (error) console.error('build:blog failed:', error.message);
       if (stderr) console.error('build:blog stderr:', stderr);
       console.log('build:blog output:', stdout);
     });
     ```
     Also validate the generated slug before writing: after slug generation (line ~38-41), add:
     ```
     if (!isValidSlug(slug)) {
       return res.status(400).json({ error: 'Invalid slug' });
     }
     ```
     Also sanitize the catch block: change `res.status(500).json({ error: 'Failed to save post' })` — this is already safe (no stack trace), so keep as-is. But ensure `console.error('Error saving post:', error)` does NOT get changed to send error to client. Remove `filePath` from the success response (leaks server directory structure):
     ```
     res.json({ success: true, message: 'Post saved successfully', slug });
     ```

  2. **GET /api/posts** (list) — No slug to validate. The catch block already returns generic error. Keep as-is except: ensure no error details leak. Already safe.

  3. **GET /api/posts/:slug** — Add slug validation at the top of the handler:
     ```
     if (!isValidSlug(slug)) {
       return res.status(400).json({ error: 'Invalid slug' });
     }
     ```
     Remove the fallback post lookup. The block that calls `getFallbackPostBySlug(slug)` when the file doesn't exist should be replaced with just returning 404:
     ```
     if (!existsSync(filePath)) {
       return res.status(404).json({ error: 'Post not found' });
     }
     ```

  4. **DELETE /api/posts/:slug** — Add slug validation at the top of the handler (same pattern as GET). Replace `exec('npm run build:blog', ...)` with `execFile('npm', ['run', 'build:blog'], ...)` (same as POST handler). Catch block already returns generic error — keep as-is.

  5. **Final error response audit:** Scan all catch blocks. None should return `error.message`, `error.stack`, or the `error` object to the client. They should all return only static strings like `{ error: 'Failed to save post' }`. The current code already does this — just verify during implementation that no refactoring accidentally introduces error details in responses.
  </action>
  <verify>
  Start the server and test:
  ```
  # Set env and start server
  # In a terminal: set BLOG_API_KEY from .env, then node server.js

  # Test path traversal blocked:
  curl http://localhost:3001/api/posts/..%2F..%2Fetc%2Fpasswd
  # Expected: 400 {"error":"Invalid slug"}

  # Test valid slug works:
  curl http://localhost:3001/api/posts/some-valid-post
  # Expected: 404 (post doesn't exist) — NOT a path traversal error

  # Test auth required for POST:
  curl -X POST http://localhost:3001/api/posts -H "Content-Type: application/json" -d '{"post":{"title":"test","content":"test"}}'
  # Expected: 403 {"error":"Forbidden"}

  # Test auth works with key:
  curl -X POST http://localhost:3001/api/posts -H "Content-Type: application/json" -H "Authorization: Bearer <key-from-env>" -d '{"post":{"title":"test","content":"test"}}'
  # Expected: 200 with success response (no filePath in response)

  # Test CORS header:
  curl -H "Origin: http://evil.com" -v http://localhost:3001/api/posts 2>&1 | grep -i access-control
  # Expected: No Access-Control-Allow-Origin header for evil.com

  # Test rate limiting:
  # Send 31+ requests rapidly — 31st should return 429
  ```
  Also verify by reading server.js:
  - Zero `exec(` calls (only `execFile(`)
  - Zero `getFallbackPostBySlug` references
  - All `:slug` routes have `isValidSlug` check before `path.join`
  - No `filePath` in any JSON response
  - No `error.stack` or `error.message` in any response body
  </verify>
  <done>
  All route handlers validate slugs before filesystem access, use execFile instead of exec, return no internal details in error responses, serve no fallback data, and don't leak server paths in success responses.
  </done>
</task>

</tasks>

<verification>
After both tasks complete, verify the full security posture:

1. **Path traversal:** `curl localhost:3001/api/posts/..%2F..%2Fetc%2Fpasswd` → 400
2. **Auth enforcement:** `curl -X POST localhost:3001/api/posts` (no key) → 403
3. **Auth pass-through:** `curl -X POST localhost:3001/api/posts -H "Authorization: Bearer $KEY"` with valid body → 200
4. **CORS blocked:** `curl -H "Origin: http://evil.com" -v localhost:3001/api/posts` → no CORS headers
5. **CORS allowed:** `curl -H "Origin: http://localhost:5173" -v localhost:3001/api/posts` → has Access-Control-Allow-Origin
6. **Rate limit:** 31+ requests in 60s from same IP → 429
7. **No exec:** `grep 'exec(' server.js` returns zero matches (only execFile)
8. **No fallbacks:** `grep 'fallback\|Fallback' server.js` returns zero matches
9. **No stack leaks:** `grep 'error\.stack\|error\.message' server.js` — only in console.error, never in res.json
10. **Server starts:** `BLOG_API_KEY=test node server.js` → "Server running on port 3001"
</verification>

<success_criteria>
- server.js has zero path traversal vectors (all slug params validated before path.join)
- CORS restricted to exactly 2 origins: http://localhost:5173, https://ctrlaltstock.com
- POST and DELETE routes require valid Bearer token matching BLOG_API_KEY env var
- Zero exec() calls in codebase — all replaced with execFile()
- Zero error.stack or error.message in HTTP responses
- Zero fallback post code remaining
- In-memory rate limiter returns 429 after 30 requests per IP per minute
- .env file exists with BLOG_API_KEY
- Server starts and runs without errors
</success_criteria>

<output>
After completion, create `.planning/phases/01-security-server-hardening/01-01-SUMMARY.md`
</output>
