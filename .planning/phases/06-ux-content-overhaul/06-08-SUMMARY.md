---
phase: 06-ux-content-overhaul
plan: 08
subsystem: ui
tags: [blog, pillar, hero]

# Dependency graph
requires: [06-07]
provides:
  - pillarPosts.ts with PILLAR_SLUGS, getPillarPosts
  - Blog hero prioritizes pillar posts
affects: [06-11]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 06 Plan 08: Pillar Hero Summary

**Blog hero rotates pillar posts first; getPillarPosts() drives Featured guides**

## Accomplishments

- pillarPosts.ts: PILLAR_SLUGS, PILLAR_TOPICS, getPillarPosts()
- BlogHome: featuredPosts = getPillarPosts(posts, FEATURED_COUNT)
- Hero title: "Featured guides"

---
*Phase: 06-ux-content-overhaul*
*Completed: 2026-02-27*
