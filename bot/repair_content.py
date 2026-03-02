"""
repair_content.py — Fix existing published posts with formatting or truncation issues.

Uses AI to:
- Add paragraph breaks (fix wall-of-text)
- Fix or remove truncated markdown links at the end

Usage:
    python bot/repair_content.py --slug 390tb-video-game-archive-being-taken-offline-due-to-skyrocketing-ram-ssd-and-har
    python bot/repair_content.py --all   # scan all posts, repair those with issues
    python bot/repair_content.py --dry-run --all   # report only, no writes
"""

import argparse
import sys
import logging
from pathlib import Path

import frontmatter as fm

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

from utils import detect_content_issues
from ai_editor import run_content_repair

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)


def get_posts_dir() -> Path:
    return Path(config.git.repo_path) / config.bot.posts_dir


def load_post(path: Path):
    return fm.load(path)


def repair_post(path: Path, dry_run: bool = False) -> bool:
    """Run detection and repair on one post. Returns True if content was repaired and saved."""
    post = load_post(path)
    content = post.content or ""
    title = (post.get("title") or path.stem).strip()
    issues = detect_content_issues(content)
    if not issues.get("wall_of_text") and not issues.get("truncated_link"):
        return False
    log.info("%s: issues wall_of_text=%s truncated_link=%s", path.name, issues.get("wall_of_text"), issues.get("truncated_link"))
    repaired = run_content_repair(content, title)
    if repaired == content:
        return False
    if not dry_run:
        post.content = repaired
        fm.dump(post, path)
        log.info("Repaired and saved: %s", path.name)
    else:
        log.info("[DRY RUN] Would repair and save: %s", path.name)
    return True


def main():
    parser = argparse.ArgumentParser(description="Repair formatting/truncation in published posts (AI)")
    parser.add_argument("--slug", type=str, help="Repair only this post slug (filename without .md)")
    parser.add_argument("--all", action="store_true", help="Scan all posts and repair those with issues")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not write")
    args = parser.parse_args()

    posts_dir = get_posts_dir()
    if not posts_dir.exists():
        log.error("Posts dir not found: %s", posts_dir)
        sys.exit(1)

    if args.slug:
        path = posts_dir / f"{args.slug}.md"
        if not path.exists():
            log.error("Post not found: %s", path)
            sys.exit(1)
        repair_post(path, dry_run=args.dry_run)
        sys.exit(0)

    if args.all:
        count = 0
        for path in sorted(posts_dir.glob("*.md")):
            if repair_post(path, dry_run=args.dry_run):
                count += 1
        log.info("Done. Repaired %d post(s).", count)
        sys.exit(0)

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
