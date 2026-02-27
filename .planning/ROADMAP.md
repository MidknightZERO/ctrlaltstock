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

**Goal:** Remove all confirmed dead/unused files and consolidate duplicated code to a single source of truth.
**Plans:** 1 plan

**Scope:**
- Delete `src/About.tsx` (unused — `src/components/About.tsx` is active)
- Delete `src/blog/blogData.ts` (duplicates `blogUtils.ts`)
- Delete `src/blog/productData.ts` (legacy incompatible schema)
- Delete `fix-markdown.js` at root (duplicate of `src/fix-markdown.js`)
- Consolidate product data: make `public/affiliate-products.json` the single source, delete `src/blog/data/products.ts` and `src/blog/data/products.json`
- Redirect imports in Home.tsx, BlockEditor.tsx, api.ts before deletions
- Remove duplicate `sys` import in `bot/publisher.py`
- Remove unused dependencies from `bot/requirements.txt` (requests, Jinja2)

Plans:
- [ ] 02-01-PLAN.md — Redirect imports, delete 6 dead/duplicate files, consolidate product data, clean bot deps

**Success criteria:** Zero duplicate files, single source of truth for product data, no dead imports, build succeeds.

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

**Goal:** Fix reliability risks in the Python bot pipeline — prevent data corruption, improve performance, add safety guards.
**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — Process safety: PID lockfile + scoped git staging
- [ ] 04-02-PLAN.md — Data integrity: SQLite WAL/indexing + atomic JSON writes
- [ ] 04-03-PLAN.md — Log rotation: RotatingFileHandler across all bot modules

**Scope:**
- Add PID lockfile to prevent concurrent scheduler runs
- Change `publisher.py` git add from `-A` to specific paths only
- Make JSON file writes atomic (write to temp, then rename)
- Enable SQLite WAL mode and busy timeout
- Fix `is_seen()` to use indexed SQL query instead of full table scan
- Add `norm_title` column to seen_posts database
- Use RotatingFileHandler for bot log files

**Success criteria:** No data corruption risk from concurrent runs, atomic writes, indexed dedup queries.

---

## Phase 05: Frontend Resilience

**Goal:** Add error boundaries, improve UX, prepare for scale with code splitting and clean dependency management.
**Plans:** 1 plan

**Scope:**
- Add React Error Boundary component
- Replace alert() with toast notifications in BlogPost.tsx
- Make API_URL configurable via environment variable
- Lazy-load editor components (code splitting)
- Move @types packages to devDependencies in package.json

Plans:
- [ ] 05-PLAN.md — ErrorBoundary + Toast components, lazy-load editors, configurable API_URL, devDeps cleanup

**Success criteria:** No white-screen crashes, editor components code-split, clean dependency categorization.

---

## Dependencies

- Phase 02 can run in parallel with Phase 01
- Phase 03 depends on Phase 02 (dead code removed first avoids wasted effort)
- Phase 04 is independent (bot-only changes)
- Phase 05 depends on Phase 03 (type fixes landed first)

---

## Phase 06: UX, Content & Growth Overhaul

**Goal:** Modernize the CtrlAltStock site UX, make the homepage and blog feel premium and trustworthy, fix content/linking/image issues, and lay foundations for SEO growth (pillar posts + internal linking) without breaking the existing bot pipeline.

**Plans:** 12 plans in 5 waves

Plans:
- [ ] 06-01-PLAN.md — Remove Twitter embed; add Latest hardware news; fix Privacy link; no Share API
- [ ] 06-02-PLAN.md — Subtle animated SVG background on homepage
- [ ] 06-03-PLAN.md — Now Tracking: current-gen GPUs/CPUs/consoles/RAM, Discord links
- [ ] 06-04-PLAN.md — Real community testimonials (WebSearch) + dual scrollers
- [ ] 06-05-PLAN.md — Complete or simplify ToS, Privacy, About; real community story
- [ ] 06-06-PLAN.md — CAS logo as blog author avatar; default author in build
- [ ] 06-07-PLAN.md — Clean tags; 9 posts per page; newest-first ordering
- [ ] 06-08-PLAN.md — Blog hero rotating pillar posts; pillar slugs
- [ ] 06-09-PLAN.md — Fix affiliate logic for game/deal posts; fix Avatar post
- [ ] 06-10-PLAN.md — Grow stock image catalogue; reduce reuse (has checkpoint)
- [ ] 06-11-PLAN.md — Define pillar topics; internal linking prefers pillars
- [ ] 06-12-PLAN.md — Pillar post generation (OpenRouter listicles, guardrails)

**High-level scope:**
- Remove or replace the dead Twitter embed and avoid any scary browser prompts
- Redesign the homepage hero + “How it works” + “Now Tracking” with current-gen hardware imagery and better CTAs
- Surface the most recent blog post on the homepage as “Latest in PC hardware”
- Replace placeholder testimonials with real community success stories (sourced from 2021–2022 Reddit/forums)
- Either complete or remove ToS, Privacy Policy, and About pages
- Add a subtle animated SVG background for the main homepage section
- Audit and fix Amazon linking + product selection for posts (e.g. Avatar: The Last Airbender £9.99 game)
- Improve blog tagging, image reuse, pagination (9 posts/page), and hero section with rotating pillar posts
- Define and seed a set of SEO pillar topics, with strong internal linking from other posts

**Success criteria:** Homepage feels modern and credible, latest content surfaced clearly, testimonials are real and attributed, blog content & affiliate linking are coherent and on-topic, tagging and image usage are cleaned up, and there is a clear plan for pillar content and future SEO growth.

---

## Phase Dependencies

- Phase 02 can run in parallel with Phase 01
- Phase 03 depends on Phase 02 (dead code removed first avoids wasted effort)
- Phase 04 is independent (bot-only changes)
- Phase 05 depends on Phase 03 (type fixes landed first)
- Phase 06 depends on Phases 02–05 (cleanup, type safety, and reliability already in place)
