# Project State

**Project:** CtrlAltStock Blog — Codebase Cleanup & Hardening
**Created:** 2026-02-27
**Current Phase:** 01 (not started)

## Completed Phases

(none)

## Decisions Made

- OpenRouter free-tier limit is 1000 req/day — sufficient for current usage (cron every 15 min, 3 articles/run = ~9 AI calls/run = ~864 calls/day max theoretical, but most runs skip if no new content)
- Express server (server.js) is development-only — production is static site
- Keep editor components (AdvancedBlogEditor, LocalEditor) — they're admin tools, not dead code
- Bot pipeline architecture is sound — fix reliability/safety issues, don't restructure

## Active Blockers

(none)
