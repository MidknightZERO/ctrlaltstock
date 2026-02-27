"""
publisher.py — Assembles the final markdown file and publishes it to the repo.

Steps:
  1. Combine frontmatter + content into a .md file
  2. Write to src/blog/posts/<slug>.md
  3. Run npm run build:blog to regenerate blog-posts.json
  4. Git add, commit, push
  5. Optionally ping Netlify/CF Pages build hook

Usage:
    python publisher.py   # reads article JSON from stdin
"""

import json
import sys
import os
import logging
import logging.handlers
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

import httpx
import yaml  # PyYAML — part of python-frontmatter deps
import frontmatter as fm

import config
from utils import strip_markdown_from_title

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            Path(config.bot.logs_dir) / "publish.log",
            encoding="utf-8", maxBytes=10_000_000, backupCount=3
        ),
    ],
)

Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)


# ── Markdown assembly ─────────────────────────────────────────────────────────

def assemble_markdown(draft: Dict[str, Any]) -> str:
    """Convert frontmatter dict + content into a complete .md file string."""
    post = fm.Post(
        content=draft["content"],
        **draft["frontmatter"]
    )
    return fm.dumps(post)


# ── File writer ───────────────────────────────────────────────────────────────

def write_post_file(draft: Dict[str, Any], repo_path: str) -> Path:
    """Write the assembled markdown to the posts directory."""
    # Safety net: strip markdown from title (AI sometimes returns "# Title")
    fm_dict = draft.get("frontmatter", {})
    if "title" in fm_dict:
        fm_dict["title"] = strip_markdown_from_title(fm_dict["title"])

    posts_dir = Path(repo_path) / config.bot.posts_dir
    posts_dir.mkdir(parents=True, exist_ok=True)

    slug = draft.get("slug") or draft["frontmatter"].get("slug", "untitled")
    filepath = posts_dir / f"{slug}.md"

    markdown = assemble_markdown(draft)
    filepath.write_text(markdown, encoding="utf-8")
    log.info("Written post to: %s", filepath)
    return filepath


# ── Blog JSON rebuild ─────────────────────────────────────────────────────────

def rebuild_blog_json(repo_path: str):
    """Run the build:blog npm script to regenerate blog-posts.json."""
    log.info("Running npm run build:blog...")
    result = subprocess.run(
        ["npm", "run", "build:blog"],
        cwd=repo_path,
        capture_output=True,
        text=True,
        shell=True,  # required on Windows
    )
    if result.returncode != 0:
        log.error("build:blog failed:\n%s", result.stderr)
        raise RuntimeError(f"npm run build:blog failed: {result.stderr}")
    log.info("blog-posts.json rebuilt successfully")


# ── Git operations ────────────────────────────────────────────────────────────

def git_commit_and_push(repo_path: str, title: str):
    """Stage all changes, commit, and push to remote."""
    from git import Repo, GitCommandError

    repo = Repo(repo_path)
    repo.git.add('src/blog/posts/')
    repo.git.add('public/blog-posts.json')
    repo.git.add('public/blog-categories.json')

    # Check if there's anything to commit
    if not repo.is_dirty(untracked_files=True):
        log.warning("Nothing to commit — skipping git push")
        return

    commit_msg = f"auto: {title[:80]}"
    repo.index.commit(commit_msg)
    log.info("Committed: %s", commit_msg)

    origin = repo.remote(config.git.remote)
    origin.push(config.git.branch)
    log.info("Pushed to %s/%s", config.git.remote, config.git.branch)


# ── Build hook ────────────────────────────────────────────────────────────────

def trigger_build_hook():
    """Ping Netlify/CF Pages build hook to trigger a redeploy."""
    hook_url = config.bot.build_hook_url
    if not hook_url:
        return
    try:
        resp = httpx.post(hook_url, timeout=10)
        resp.raise_for_status()
        log.info("Build hook triggered: %s", hook_url)
    except Exception as e:
        log.error("Build hook failed: %s", e)


# ── Discord notification ──────────────────────────────────────────────────────

def notify_discord(title: str, slug: str, success: bool, error: str = ""):
    """Send a success or failure notification to the Discord admin webhook."""
    webhook = config.bot.discord_webhook_url
    if not webhook:
        return
    try:
        if success:
            color = 0x00FF88
            desc = f"[SUCCESS] New article published: **{title}**\n🔗 `/blog/{slug}`"
        else:
            color = 0xFF4444
            desc = f"[FAILED] Pipeline failed for: **{title}**\n```{error[:500]}```"

        payload = {
            "embeds": [{
                "title": "CtrlAltStock Blog Bot",
                "description": desc,
                "color": color,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "footer": {"text": "CtrlAltStock Autopublisher"},
            }]
        }
        httpx.post(webhook, json=payload, timeout=5)
    except Exception as e:
        log.error("Discord notification failed: %s", e)


# ── Main publish function ─────────────────────────────────────────────────────

def publish(draft: Dict[str, Any], dry_run: bool = False) -> bool:
    """
    Full publish flow: write file → rebuild JSON → git push → notify.
    Returns True on success, False on failure.
    """
    title = draft["frontmatter"].get("title", "Unknown Article")
    slug = draft.get("slug", "unknown")
    repo_path = config.git.repo_path

    try:
        # 1. Write post file
        if not dry_run:
            write_post_file(draft, repo_path)
        else:
            log.info("[DRY RUN] Would write: %s", slug)
            md = assemble_markdown(draft)
            log.info("[DRY RUN] Markdown preview (first 500 chars):\n%s", md[:500])
            return True

        # 2. Rebuild blog JSON
        rebuild_blog_json(repo_path)

        # 3. Git commit & push
        if (Path(repo_path) / ".git").exists():
            git_commit_and_push(repo_path, title)
        else:
            log.warning("Not a git repository (no .git found) — skipping commit/push")

        # 4. Trigger build hook (optional)
        trigger_build_hook()

        # 5. Notify Discord
        notify_discord(title, slug, success=True)

        log.info("[SUCCESS] Published successfully: %s", title)
        return True

    except Exception as e:
        log.error("[ERROR] Publish failed: %s", e, exc_info=True)
        notify_discord(title, slug, success=False, error=str(e))
        return False


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    draft = json.loads(sys.stdin.read())
    success = publish(draft, dry_run=args.dry_run)
    sys.exit(0 if success else 1)
