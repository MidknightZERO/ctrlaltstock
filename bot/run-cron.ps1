# Run the blog pipeline (3 articles every 30 min when used with Task Scheduler)
# Usage: Schedule this script in Windows Task Scheduler to run every 30 minutes
#
# What it does: Invokes scheduler.py --once, which:
#   1. Resumes any partial draft (if present), then fetches top N stories
#   2. For each story: AI writer (draft + image_search_queries) -> refiner -> editor -> Amazon -> image_fetcher (uses AI image search terms for Unsplash) -> publish
#   3. After any successful publish: backfill (links, inline images), then git push
#   4. If BOT_RUN_IMAGE_REFRESH_AFTER_CRON=1 in bot/.env: also runs generate_fix_list + backfill --images-only so existing posts get topic-relevant cover images
#
# AI search terms for images: New articles get image_search_queries from the writer; image_fetcher uses them for Unsplash. For existing posts, run .\bot\run-fix-existing.ps1 or set BOT_RUN_IMAGE_REFRESH_AFTER_CRON=1.

# Use Continue so Python's stderr (logging) doesn't trigger NativeCommandError
$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$env:REPO_PATH = $repoRoot
Set-Location $repoRoot

$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir "cron.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "`n--- $timestamp ---"

& python bot/scheduler.py --once >> $logFile 2>&1
