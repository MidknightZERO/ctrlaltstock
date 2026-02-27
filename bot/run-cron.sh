#!/bin/bash
# Run the blog pipeline (3 articles every 30 min when used with cron)
# Usage: Add to crontab: */30 * * * * /path/to/blog/bot/run-cron.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO"
export REPO_PATH="$REPO"

LOG_DIR="$REPO/bot/logs"
mkdir -p "$LOG_DIR"

# Use python3 or python
PYTHON=$(command -v python3 2>/dev/null || command -v python)
exec "$PYTHON" bot/scheduler.py --once >> "$LOG_DIR/cron.log" 2>&1
