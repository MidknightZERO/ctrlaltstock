# Run the blog pipeline (3 articles every 30 min when used with Task Scheduler)
# Usage: Schedule this script in Windows Task Scheduler to run every 30 minutes

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
