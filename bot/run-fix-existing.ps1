# One-time fix for existing posts.
# Step order is REQUIRED. Do not skip 1 or 2 if you want topic-relevant images and distribution-aware linking.
#
# 1. Validate → report (validation-report.json) — for distribution-aware linking in step 3
# 2. Generate fix list → AI suggests image search terms per post (fix-list.json) — REQUIRED for step 4
# 3. Apply excerpt/link fixes (backfill) — uses validation-report.json
# 4. Refresh cover images using fix-list terms (backfill --images-only) — uses fix-list.json; will ABORT if missing
# 5. Rebuild blog JSON
#
# Run from repo root: .\bot\run-fix-existing.ps1

# Use Continue so Python's stderr (logging) doesn't trigger NativeCommandError; we still check $LASTEXITCODE per step.
$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

$validationReportPath = "bot\.tmp\validation-report.json"
$fixListPath = "bot\.tmp\fix-list.json"

Write-Host "1/5 Validating existing posts (report for fix list)..."
& python bot/validate_existing_content.py 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Validate step returned exit code $LASTEXITCODE. Continuing anyway; step 3 will run without validation report."
}
if (-not (Test-Path $validationReportPath)) {
    Write-Warning "Validation report not found at $validationReportPath. Step 3 will use empty report."
}

Write-Host "`n2/5 Generating fix list (AI image search terms per post for topic-relevant images)..."
& python bot/generate_fix_list.py 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Generate fix list failed (exit $LASTEXITCODE). Fix list is required for topic-relevant images in step 4. Aborting."
    exit $LASTEXITCODE
}
if (-not (Test-Path $fixListPath)) {
    Write-Error "Fix list was not created at $fixListPath. Run generate_fix_list.py successfully first. Aborting before image refresh."
    exit 1
}

Write-Host "`n3/5 Fixing placeholder and mismatched excerpts, links, inline images..."
& python bot/backfill_content.py 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backfill failed (exit $LASTEXITCODE). Aborting."
    exit $LASTEXITCODE
}

Write-Host "`n4/5 Refreshing cover images using fix-list (Pexels search per post topic)..."
# Fix list already verified above
& python bot/backfill_content.py --images-only 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backfill --images-only failed (exit $LASTEXITCODE). Aborting."
    exit $LASTEXITCODE
}

Write-Host "`n5/5 Rebuilding blog JSON..."
& npm run build:blog 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "build:blog failed (exit $LASTEXITCODE). Aborting."
    exit $LASTEXITCODE
}

Write-Host "`nDone. Refresh your blog page to see updated excerpts and topic-relevant images."
