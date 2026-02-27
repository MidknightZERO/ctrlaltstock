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

## Manual Run

```bash
# One run (3 articles)
python bot/scheduler.py --once

# Dry run (no writes, no git push)
python bot/scheduler.py --once --dry-run
```
