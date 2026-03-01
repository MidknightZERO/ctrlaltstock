# One-time fix for existing posts:
# 1. Validate → report (validation-report.json)
# 2. Generate fix list → AI suggests image search terms per post (fix-list.json)
# 3. Apply excerpt/link fixes (backfill)
# 4. Refresh cover images using fix-list terms (backfill --images-only)
# 5. Rebuild blog JSON
# Run from repo root: .\bot\run-fix-existing.ps1

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

Write-Host "1/5 Validating existing posts (report for fix list)..."
& python bot/validate_existing_content.py 2>&1

Write-Host "`n2/5 Generating fix list (AI image search terms per post for topic-relevant images)..."
& python bot/generate_fix_list.py 2>&1

Write-Host "`n3/5 Fixing placeholder and mismatched excerpts..."
& python bot/backfill_content.py 2>&1

Write-Host "`n4/5 Refreshing cover images using fix-list (Unsplash search per post topic)..."
& python bot/backfill_content.py --images-only 2>&1

Write-Host "`n5/5 Rebuilding blog JSON..."
& npm run build:blog 2>&1

Write-Host "`nDone. Refresh your blog page to see updated excerpts and topic-relevant images."
