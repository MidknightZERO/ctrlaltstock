# Cron / Scheduled Task Setup

The blog pipeline creates **3 new articles every 30 minutes** from the top 3 stories in your pulled data (Reddit + RSS feeds).

## Quick Start

### Linux / Mac (cron)

1. Make the script executable:
   ```bash
   chmod +x bot/run-cron.sh
   ```

2. Edit crontab:
   ```bash
   crontab -e
   ```

3. Add this line (adjust the path to your repo):
   ```
   */30 * * * * /path/to/Blog/bot/run-cron.sh
   ```

   Or run directly with Python:
   ```
   */30 * * * * cd /path/to/Blog && python bot/scheduler.py --once >> bot/logs/cron.log 2>&1
   ```

### Windows (Task Scheduler)

1. Open **Task Scheduler** (taskschd.msc)

2. Create Basic Task:
   - Name: `CtrlAltStock Blog Pipeline`
   - Trigger: **Daily** (we'll change to 30 min)
   - Action: **Start a program**
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\jacob\Downloads\WebDev\Blog\bot\run-cron.ps1"`

3. After creating, open the task → **Triggers** → Edit:
   - Change to **Repeat task every: 30 minutes**
   - For a duration of: **Indefinitely**
   - Or set a 24-hour window if you only want it while you sleep

4. Ensure **Run whether user is logged on or not** if the PC runs overnight.

## Git Push

Each cron run pushes commits to the remote after publishing:
1. Each new article is committed and pushed by the publisher
2. After backfill (inline images, featured product), a final commit pushes any remaining changes

Ensure `origin` points to your repo and you have push access:
```bash
git remote -v
# origin  https://github.com/MidknightZERO/ctrlaltstock.git
```

## Configuration

- **Articles per run**: Set `ARTICLES_PER_RUN=3` in `bot/.env` (default: 3)
- **Logs**: `bot/logs/cron.log` and `bot/logs/scheduler.log`
- **Image refresh for existing posts**: To refresh cover images (with topic-relevant Pexels search) after each cron run, set `BOT_RUN_IMAGE_REFRESH_AFTER_CRON=1` in `bot/.env`. This runs AI fix-list generation then backfill --images-only — more API calls and time per run.

## Fix existing posts (manual, correct order)

For topic-relevant images and distribution-aware linking on **existing** posts, run the fix-existing pipeline in order:

1. **Validate** → `bot/.tmp/validation-report.json` (used for distribution-aware linking)
2. **Generate fix list** → `bot/.tmp/fix-list.json` (AI image search terms per post; **required** for step 4)
3. **Backfill** → tags, links, excerpts, inline images (uses validation report)
4. **Backfill images only** → refresh covers using fix list (Pexels); **aborts if fix list missing**
5. **Build** → `npm run build:blog`

From repo root:

```powershell
.\bot\run-fix-existing.ps1
```

Do not skip steps 1 or 2 if you want topic-relevant images; step 4 will abort if the fix list was not created.

**Only re-fetch failed covers**: To re-run image backfill only for posts that currently show the CAS logo (i.e. every source failed), use:
```powershell
python bot/backfill_content.py --images-only --only-failed-covers
```
This skips posts that already have a real cover so you can target only “failed” posts.

## Manual Run

```bash
# One run (3 articles)
python bot/scheduler.py --once

# Dry run (no writes, no git push)
python bot/scheduler.py --once --dry-run
```

## Partial Drafts (Crash Recovery)

When the pipeline crashes (e.g. import error, API failure), the current draft is saved to `bot/.tmp/drafts/` so it isn't lost.

- **Automatic resume**: The next cron run resumes any partial drafts first, then processes new stories.
- **Manual resume**:
  ```bash
  python bot/resume_draft.py              # Resume oldest
  python bot/resume_draft.py --list      # List saved drafts
  python bot/resume_draft.py 20260227_075325_slug.json
  ```
