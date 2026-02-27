# Phase 06: UX, Content & Growth Overhaul — Master Plan

**Goal:** Modernize the CtrlAltStock site UX, make the homepage and blog feel premium and trustworthy, fix content/linking/image issues, and lay foundations for SEO growth (pillar posts + internal linking) without breaking the existing bot pipeline.

**Plans:** 12 plans in 5 waves. Execute in wave order; within a wave, plans can run in parallel unless `depends_on` says otherwise.

---

## Wave 1 — Homepage UX (ship first)

| Plan | Objective | Key files |
|------|-----------|-----------|
| [06-01-PLAN.md](./06-01-PLAN.md) | Remove Twitter embed; add "Latest hardware news" (single post below How it works); fix Privacy link; no Share API | App.tsx, index.html, Layout.tsx |
| [06-02-PLAN.md](./06-02-PLAN.md) | Subtle animated SVG background on homepage (matrix/geometry, CSS/SVG only) | HomepageBackground.tsx, App.tsx |
| [06-03-PLAN.md](./06-03-PLAN.md) | Now Tracking: current-gen GPUs/CPUs/consoles/RAM, images + Discord links | InfiniteScroll.tsx |

**QA:** After Wave 1: `npm run dev` → `/` has no Twitter, has Latest hardware news, new background, refreshed Now Tracking; Privacy link works.

---

## Wave 2 — Testimonials & Legal

| Plan | Objective | Key files |
|------|-----------|-----------|
| [06-04-PLAN.md](./06-04-PLAN.md) | Real community testimonials (WebSearch 2021/2022 Reddit/forums); dual opposite-direction scrollers | communityTestimonials.ts, CommunityTestimonialsScroller.tsx, App.tsx |
| [06-05-PLAN.md](./06-05-PLAN.md) | Complete or simplify ToS, Privacy, About; About = real community story | TermsOfService.tsx, Privacy.tsx, About.tsx |

**QA:** Testimonials are real and attributed; ToS/Privacy/About coherent; footer links correct.

---

## Wave 3 — Blog UX

| Plan | Objective | Key files |
|------|-----------|-----------|
| [06-06-PLAN.md](./06-06-PLAN.md) | CAS logo as blog author avatar for team posts; default author in build | BlogPost.tsx, BlogHome.tsx, build-blog.js |
| [06-07-PLAN.md](./06-07-PLAN.md) | Clean tags (no word-salad); fix ordering (newest first); 9 posts per page | BlogHome.tsx, tagHierarchy.ts, build-blog.js |
| [06-08-PLAN.md](./06-08-PLAN.md) | Blog hero = rotating pillar-post hero; define pillar slugs | pillarPosts.ts, BlogHome.tsx |

**QA:** Blog shows 9/post, newest first, clean tags; hero rotates pillar posts; author avatar = logo where appropriate.

---

## Wave 4 — Affiliate & Images

| Plan | Objective | Key files |
|------|-----------|-----------|
| [06-09-PLAN.md](./06-09-PLAN.md) | Fix affiliate logic for game/deal posts; fix Avatar post (correct product, no GPU/headset) | amazon_linker.py, affiliate-products.json, avatar post markdown |
| [06-10-PLAN.md](./06-10-PLAN.md) | Grow curated stock image catalogue; bot prefers least-recently-used images | stock_images.json, used_images.json, publisher/refiner |

**Note:** 06-10 includes a **checkpoint:human-verify** (autonomous: false).

**QA:** Game posts link to correct products; Avatar post fixed; image reuse reduced; directive updated.

---

## Wave 5 — Pillar & SEO

| Plan | Objective | Key files |
|------|-----------|-----------|
| [06-11-PLAN.md](./06-11-PLAN.md) | Define pillar topics; internal linking prefers pillar slugs; directive | pillarPosts.ts, ai_editor.py, directives/internal_linking.md |
| [06-12-PLAN.md](./06-12-PLAN.md) | Pillar post generation via OpenRouter (listicles, many Amazon links, guardrails) | ai_writer.py, amazon_linker.py, directives/pillar_content.md |

**QA:** Pillar slugs used in linking; one pillar listicle generatable end-to-end with links.

---

## Testing at each stage

- **After each plan:** `npm run build` passes; manual click-through on affected routes; no console errors.
- **Routes to check:** `/`, `/blog`, `/blog/:slug`, `/about`, `/terms-of-service`, `/privacy-policy`.
- **Data to inspect:** `public/blog-posts.json` (order, author, tags); `public/affiliate-products.json` (game entry); bot output (amazon_linker, image selection).
- **WebSearch required:** 06-04 (real testimonials); optional for 06-11/06-12 (pillar topic research).

---

## Dependencies

- 06-08 depends on 06-07 (pillar hero uses tags/pagination).
- 06-11 depends on 06-08 (pillar slugs from pillarPosts.ts).
- 06-12 depends on 06-11 (pillar-first linking and slug list).
