# Phase 07-03 Summary: Image Workflow + Backfill Order

**Completed:** 2026-03-01

## What was done

### A. Phase plan

- **Created** `.planning/phases/07-image-handling-blog-order/07-03-PLAN.md`: concrete plan for image + backfill order with root causes, canonical execution order, and tasks (tighten run-fix-existing, backfill warn/require-fix-list, scheduler optional image refresh, document dependency graph).

### B. Script and config changes

1. **`bot/run-fix-existing.ps1`**
   - Header comments state step order is required and that steps 1–2 produce required artifacts.
   - `$ErrorActionPreference = "Stop"` so failures are visible.
   - After step 1: if exit code non-zero, warn; if `validation-report.json` missing, warn (step 3 continues with empty report).
   - After step 2: if exit code non-zero, abort with error; if `fix-list.json` missing, abort with message: "Fix list was not created... Run generate_fix_list.py successfully first. Aborting before image refresh."
   - Steps 3, 4, 5: check `$LASTEXITCODE` and exit with that code on failure.
   - Step 4 always runs only after fix list was verified in step 2.

2. **`bot/backfill_content.py`**
   - When `--images-only` and fix list is missing or has no `posts`: log a **WARNING** that fix-list.json is missing and to run generate_fix_list.py first; proceed with title-based search only.
   - New flag **`--require-fix-list`**: with `--images-only`, if fix list is missing or empty, log error and **exit 1** (no image refresh). Use for scripts/automation that must have topic-relevant terms.

3. **`bot/config.py`**
   - **`run_image_refresh_after_cron`** (from env `BOT_RUN_IMAGE_REFRESH_AFTER_CRON`, values `1`/`true`/`yes`): when True, scheduler runs image refresh after the normal backfill.

4. **`bot/scheduler.py`**
   - After successful backfill (links + inline images), if `config.bot.run_image_refresh_after_cron` is True:
     - Call `generate_fix_list.run(dry_run=False)` to refresh `bot/.tmp/fix-list.json`.
     - Call `run_backfill(..., images_only=True)` to refresh cover images using Pexels and the fix list.
     - Log "Image refresh (fix list + covers) completed."
   - Failures in image refresh are non-fatal (warning only); git push still runs.

5. **`bot/CRON-SETUP.md`**
   - **Configuration**: documented `BOT_RUN_IMAGE_REFRESH_AFTER_CRON=1` for optional image refresh after cron.
   - **Fix existing posts (manual)**: new section describing the correct order (validate → generate fix list → backfill → backfill --images-only → build), what each artifact is for, and that `run-fix-existing.ps1` aborts step 4 if fix list is missing.

## How to verify

- **run-fix-existing.ps1**: Run it; after step 2 delete `bot/.tmp/fix-list.json` and run again — script should abort before step 4 with a clear error.
- **backfill --images-only**: With fix list removed, run `python bot/backfill_content.py --images-only` → warning in log. Run `python bot/backfill_content.py --images-only --require-fix-list` with no fix list → exit 1.
- **Scheduler**: Set `BOT_RUN_IMAGE_REFRESH_AFTER_CRON=1` in `bot/.env`, run `python bot/scheduler.py --once` (with at least one publish or mock); logs should show "Running image refresh..." and "Image refresh (fix list + covers) completed." Unset the env and run again → no image refresh step.

## Next steps (out of scope for this phase)

- Broaden image anti-reuse (all posts, not just 7-day + 50 URLs).
- Relax query cleaning so corporate/CPU articles don’t get GPU-only phrases.
- Validate AI `image_search_queries` for topic match before calling Pexels/Unsplash.
- Publish-time slug/duplicate content checks.
