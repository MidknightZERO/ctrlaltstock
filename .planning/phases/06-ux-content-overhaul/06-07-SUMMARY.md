---
phase: 06-ux-content-overhaul
plan: 07
subsystem: ui
tags: [blog, tags, pagination]

# Dependency graph
requires: []
provides:
  - 9 posts per page
  - Newest-first ordering
  - Clean tags (DISPLAY_TAGS allowlist)
affects: [06-08]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 06 Plan 07: Clean Tags, 9 Posts, Newest First Summary

**9 posts per page; strict date order; tags filtered to allowlist to avoid word-salad**

## Accomplishments

- POSTS_PER_PAGE 6 → 9
- tagHierarchy: DISPLAY_TAGS, isDisplayableTag()
- displayTags filtered before UI; ?tag= still filters by any tag

---
*Phase: 06-ux-content-overhaul*
*Completed: 2026-02-27*
