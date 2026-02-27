---
phase: 06-ux-content-overhaul
plan: 09
subsystem: bot
tags: [amazon_linker, affiliate, game, deals]

# Dependency graph
requires: []
provides:
  - Game/deal topic in infer_primary_topic
  - amazon_linker excludes GPU for game articles
  - Avatar post fixed
affects: []

# Metrics
duration: 15min
completed: 2026-02-27
---

# Phase 06 Plan 09: Affiliate Logic for Games Summary

**Game/deal articles get game-appropriate products; Avatar post links to correct game**

## Accomplishments

- utils.infer_primary_topic: game/deals for avatar, flash sale, etc.
- amazon_linker: exclude GPU for game topic; prefer game/gaming; fallback queries
- affiliate-products.json: Avatar game entry
- Avatar post: B0B9H3B5KN, removed PS5/GPU/Thermal links

---
*Phase: 06-ux-content-overhaul*
*Completed: 2026-02-27*
