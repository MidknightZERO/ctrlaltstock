---
phase: 06-ux-content-overhaul
plan: 04
subsystem: ui
tags: [react, testimonials, HardForum, scroller]

# Dependency graph
requires: []
provides:
  - Real community testimonials from GPU stock alert era
  - Dual opposite-direction scrollers
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [CSS animation for infinite scroll, testimonial cards with source links]

key-files:
  created: [src/data/communityTestimonials.ts, src/components/CommunityTestimonialsScroller.tsx]
  modified: [src/App.tsx]

key-decisions:
  - "Used HardForum GPU guide (2020-2021) - CtrlAltStock-specific mentions not found in search"
  - "6 real quotes with username, sourceUrl, platform"

# Metrics
duration: 15min
completed: 2026-02-27
---

# Phase 06 Plan 04: Community Testimonials Summary

**Real community testimonials from HardForum GPU stock guide; dual opposite-direction scrollers**

## Accomplishments

- communityTestimonials.ts: 6 real quotes from HardForum "How to Acquire a NEW Generation Card" thread (Dec 2020–Jan 2021)
- Users: Jimmmy, noko, Supercharged_Z06, Sky15 — describe getting GPUs via Discord/StockDrops alerts
- CommunityTestimonialsScroller: two rows, one scrolls left, one scrolls right (45s CSS animation)
- Cards: quote, username, Source link to sourceUrl, platform
- Replaced placeholder TESTIMONIALS grid in App.tsx

## Deviations from Plan

- CtrlAltStock-specific mentions were not found in WebSearch; used testimonials from broader GPU stock alert community (StockDrops, HardForum) per plan: "describe getting GPUs/consoles with the help of the community or stock alerts"

## Task Commits

1. **feat(06-04): Real community testimonials + dual scrollers** - `beedebc`

---
*Phase: 06-ux-content-overhaul*
*Completed: 2026-02-27*
