# Initialize git (if needed) and push to GitHub
# Run from repo root: .\scripts\git-init-and-push.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$remote = "https://github.com/MidknightZERO/ctrlaltstock.git"
$branch = "main"

if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..."
    git init
    git branch -M $branch
    git remote add origin $remote
}

git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host "Nothing to commit."
    exit 0
}

git commit -m "feat: blog pipeline, cron setup, images & amazon overhaul"
git push -u origin $branch
Write-Host "Pushed to $remote"
