# Roadmap: Codebase Cleanup & Hardening

**Project:** CtrlAltStock Blog
**Created:** 2026-02-27
**Source:** Codebase mapping analysis (.planning/codebase-map/)

## Phase 01: Security & Server Hardening

**Goal:** Eliminate security vulnerabilities in server.js — path traversal, missing auth, open CORS, shell injection surface.
**Plans:** 1 plan

**Scope:**
- Sanitize slug parameter to prevent path traversal
- Restrict CORS to localhost + production domain
- Add basic API key authentication
- Switch from exec() to execFile() for build triggers
- Add rate limiting
- Remove stack traces from error responses
- Remove hardcoded fallback posts

Plans:
- [ ] 01-PLAN.md — Full security hardening of server.js (slug validation, CORS, auth, execFile, rate limiting, error sanitization, fallback removal)

**Success criteria:** No unauthenticated write access, no path traversal, CORS locked down.

---

## Phase 02: Dead Code & Duplication Removal

**Goal:** Remove all confirmed dead/unused files and consolidate duplicated code.
**Plans:** 1 plan

**Scope:**
- Delete `src/About.tsx` (unused — `src/components/About.tsx` is active)
- Delete `src/blog/blogData.ts` (duplicates `blogUtils.ts`)
- Delete `src/blog/productData.ts` (legacy incompatible schema)
- Delete `fix-markdown.js` at root (duplicate of `src/fix-markdown.js`)
- Consolidate product data: make `public/affiliate-products.json` the single source, delete `src/blog/data/products.ts` and `src/blog/data/products.json`
- Remove duplicate `sys` import in `bot/publisher.py`
- Remove unused dependencies from `bot/requirements.txt` (requests, Jinja2)

Plans:
- [ ] 02-01-PLAN.md — Delete 6 dead/duplicate files, redirect imports, clean bot deps

**Success criteria:** Zero duplicate files, single source of truth for product data, no dead imports.

---

## Phase 03: Type Safety & Code Quality

**Goal:** Fix TypeScript type safety issues, remove @ts-nocheck, eliminate as-any casts, remove debug logging, delete dead code.

**Plans:** 2 plans in 1 wave (parallel)

Plans:
- [ ] 03-01-PLAN.md — Extend BlogPost type, fix as-any in consumers, remove debug logging, delete dead api.ts
- [ ] 03-02-PLAN.md — Fix discriminated union narrowing in markdownUtils.ts and BlockEditor.tsx

**Scope:**
- Extend BlogPost type with `primaryTag`, `relatedPostSlugs` fields
- Remove all `as any` casts in `markdownUtils.ts` (use proper discriminated union narrowing)
- Remove `as any` casts in `BlogPost.tsx` and `blogUtils.ts`
- Remove 10 `as any` casts in `BlockEditor.tsx`
- Delete dead `src/server/api.ts` (nothing imports it)
- Add missing ContentBlock import in `markdownUtils.ts`
- Remove debug console.log statements from production code

**Success criteria:** Zero @ts-nocheck, zero unnecessary as-any casts, zero debug console.log in frontend.

---

## Phase 04: Bot Reliability & Data Integrity

**Goal:** Fix reliability risks in the Python bot pipeline.

**Scope:**
- Add PID lockfile to prevent concurrent scheduler runs
- Change `publisher.py` git add from `-A` to specific paths only
- Make JSON file writes atomic (write to temp, then rename)
- Enable SQLite WAL mode and busy timeout
- Fix `is_seen()` to use indexed SQL query instead of full table scan
- Add `norm_title` column to seen_posts database
- Use RotatingFileHandler for bot log files
- Remove hardcoded fallback posts from server.js

**Success criteria:** No data corruption risk from concurrent runs, atomic writes, indexed dedup queries.

---

## Phase 05: Frontend Resilience

**Goal:** Add error boundaries, fix data fetching issues, prepare for scale.

**Scope:**
- Add React Error Boundary component
- Replace alert() with toast notifications in BlogPost.tsx
- Make API_URL configurable via environment variable
- Lazy-load editor components (code splitting)
- Move @types packages to devDependencies in package.json

**Success criteria:** No white-screen crashes, editor components code-split, clean dependency categorization.

---

## Dependencies

- Phase 02 can run in parallel with Phase 01
- Phase 03 depends on Phase 02 (dead code removed first avoids wasted effort)
- Phase 04 is independent (bot-only changes)
- Phase 05 depends on Phase 03 (type fixes landed first)
