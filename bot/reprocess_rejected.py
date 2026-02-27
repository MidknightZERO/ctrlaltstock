"""
reprocess_rejected.py — Manually run the top 5 rejected candidates through the pipeline.

Reads the most recent entry from bot/logs/rejected_candidates.jsonl, takes the first 5
rejected stories, and runs each through the full pipeline (writer → refiner → editor →
images → amazon → publish).

Usage:
    python bot/reprocess_rejected.py           # Process top 5, publish for real
    python bot/reprocess_rejected.py --dry-run # Process top 5, no file writes or git push
    python bot/reprocess_rejected.py -n 3     # Process top 3 instead of 5
"""

import json
import sys
import logging
import logging.handlers
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

import httpx

import config

# Add bot dir to path so we can import pipeline modules
_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            Path(config.bot.logs_dir) / "reprocess_rejected.log",
            encoding="utf-8", maxBytes=10_000_000, backupCount=3
        ),
    ],
)
log = logging.getLogger(__name__)


def fetch_reddit_post(post_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a Reddit post by ID (e.g. 1rfdq53) via public JSON API. Returns story dict or None."""
    url = f"https://www.reddit.com/comments/{post_id}.json"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; CtrlAltStockBot/1.0)"}
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                log.warning("Reddit fetch failed for %s: %d", post_id, resp.status_code)
                return None
            data = resp.json()
            if not data or not isinstance(data, list):
                return None
            post = data[0]["data"]["children"][0]["data"]
            return {
                "title": post.get("title", ""),
                "summary": (post.get("selftext", "") or "")[:800],
                "source_url": post.get("url") or f"https://reddit.com{post.get('permalink', '')}",
                "source_type": "reddit",
                "subreddit": post.get("subreddit", "hardware"),
                "raw_content": (post.get("selftext", "") or post.get("title", ""))[:2000],
            }
    except Exception as e:
        log.warning("Could not fetch Reddit post %s: %s", post_id, e)
        return None


def fetch_rss_article(url: str) -> Optional[str]:
    """Fetch and extract article text from an RSS-linked URL. Returns raw_content or None."""
    try:
        from scraper import fetch_article_text
        return fetch_article_text(url)
    except Exception as e:
        log.warning("Could not fetch RSS article %s: %s", url[:60], e)
        return None


def to_story_brief(r: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Convert a rejected-candidate entry to a full story brief for the pipeline.
    Fetches from Reddit/RSS if stored data is incomplete (old log format).
    """
    summary = r.get("summary", "")
    source_url = r.get("source_url", "")
    raw_content = r.get("raw_content", "") or r.get("summary", "") or r.get("title", "")

    # Old format: missing summary/source_url/raw_content — fetch from source
    if not raw_content or (r.get("source_type") == "reddit" and not source_url):
        rid = r.get("id", "")
        if rid.startswith("reddit:"):
            post_id = rid.replace("reddit:", "").strip()
            fetched = fetch_reddit_post(post_id)
            if fetched:
                return {
                    "id": rid,
                    "title": r.get("title", ""),
                    "summary": fetched.get("summary", ""),
                    "source_url": fetched.get("source_url", ""),
                    "source_type": "reddit",
                    "subreddit": fetched.get("subreddit", "hardware"),
                    "raw_content": fetched.get("raw_content", ""),
                    "story_angle": r.get("story_angle", "news"),
                }
            log.warning("Skipping %s: could not fetch from Reddit", r.get("title", "")[:50])
            return None
        if rid.startswith("rss:"):
            url = rid.replace("rss:", "").strip()
            if url.startswith("http"):
                content = fetch_rss_article(url)
                if content:
                    return {
                        "id": rid,
                        "title": r.get("title", ""),
                        "summary": content[:500],
                        "source_url": url,
                        "source_type": "rss",
                        "source_name": r.get("source_name", "Tech News"),
                        "raw_content": content[:2000],
                        "story_angle": r.get("story_angle", "news"),
                    }
            log.warning("Skipping %s: could not fetch RSS URL", r.get("title", "")[:50])
            return None

    return {
        "id": r.get("id", ""),
        "title": r.get("title", ""),
        "summary": summary,
        "source_url": source_url,
        "source_type": r.get("source_type", "reddit"),
        "subreddit": r.get("subreddit", "hardware"),
        "source_name": r.get("source_name", "Tech News"),
        "raw_content": raw_content[:2000] if raw_content else "",
        "story_angle": r.get("story_angle", "news"),
    }


def load_existing_posts() -> List[Dict[str, Any]]:
    """Load published blog posts from blog-posts.json."""
    json_path = Path(config.git.repo_path) / config.bot.blog_json_path
    if not json_path.exists():
        return []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        posts = data if isinstance(data, list) else []
        return [
            {"title": p.get("title", ""), "slug": p.get("slug", ""), "tags": p.get("tags", [])}
            for p in posts
        ]
    except Exception:
        return []


def is_already_published(story: Dict[str, Any], existing_posts: List[Dict[str, Any]]) -> bool:
    """True if this story appears to already have a published article (by title similarity)."""
    if not existing_posts:
        return False
    try:
        from scraper import similarity_to_existing
        return similarity_to_existing(story, existing_posts) >= 0.6
    except ImportError:
        # Fallback: simple normalized title match
        import re
        def norm(s: str) -> str:
            return re.sub(r"[^a-z0-9]", "", (s or "").lower())
        story_norm = norm(story.get("title", ""))
        for p in existing_posts:
            if story_norm and norm(p.get("title", "")) == story_norm:
                return True
            # Substring: if story title is mostly contained in existing
            existing_norm = norm(p.get("title", ""))
            if len(story_norm) >= 10 and story_norm in existing_norm:
                return True
        return False


def load_top_rejected(n: int = 5) -> List[Dict[str, Any]]:
    """Load the top N rejected candidates from the most recent run."""
    log_path = Path(config.bot.logs_dir) / "rejected_candidates.jsonl"
    if not log_path.exists():
        log.error("No rejected_candidates.jsonl found at %s", log_path)
        return []

    lines = log_path.read_text(encoding="utf-8").strip().split("\n")
    if not lines:
        log.error("rejected_candidates.jsonl is empty")
        return []

    last_line = lines[-1]
    try:
        entry = json.loads(last_line)
    except json.JSONDecodeError as e:
        log.error("Invalid JSON in last line: %s", e)
        return []

    rejected = entry.get("rejected", [])
    if not rejected:
        log.warning("Most recent run had no rejected candidates")
        return []

    return rejected[:n]


def run_pipeline_for_story(story: Dict[str, Any], dry_run: bool) -> bool:
    """Run the full pipeline for a single story. Returns True on success."""
    try:
        from ai_writer import write_article
        from ai_refiner import refine_article
        from ai_editor import run_editorial_pass
        from image_fetcher import fetch_images
        from amazon_linker import find_products_for_article
        from publisher import publish
    except ImportError as e:
        log.error("Pipeline import failed: %s", e)
        return False

    try:
        log.info("Writing article: %s", story["title"])
        draft = write_article(story)
    except ValueError as e:
        log.error("Writer aborted: %s", e)
        return False

    try:
        draft = refine_article(draft)
    except ValueError as e:
        log.error("Refiner aborted: %s", e)
        return False

    draft = run_editorial_pass(draft)
    draft = fetch_images(draft)
    draft = find_products_for_article(draft)

    final_words = len(draft["content"].split())
    min_words = getattr(config.bot, "article_min_words", 800)
    if final_words < min_words:
        log.error("Article below minimum (%d < %d words). Refusing to publish.", final_words, min_words)
        return False

    success = publish(draft, dry_run=dry_run)
    if success:
        log.info("[SUCCESS] Published: %s", draft["frontmatter"].get("title", ""))
    return success


def main():
    parser = argparse.ArgumentParser(description="Process top N rejected candidates through the pipeline")
    parser.add_argument("-n", "--count", type=int, default=5, help="Number of rejected to process (default: 5)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files or push to git")
    args = parser.parse_args()

    log.info("Loading top %d rejected candidates...", args.count)
    rejected = load_top_rejected(n=args.count)
    if not rejected:
        sys.exit(1)

    log.info("Found %d rejected. Converting to story briefs and filtering already-published...", len(rejected))
    existing_posts = load_existing_posts()
    stories = []
    for r in rejected:
        brief = to_story_brief(r)
        if not brief:
            log.warning("  Skipped (could not build brief): %s", r.get("title", "")[:60])
            continue
        if is_already_published(brief, existing_posts):
            log.info("  [rank %s] Skipped (already published): %s", r.get("rank", "?"), r.get("title", "")[:60])
            continue
        stories.append(brief)
        log.info("  [rank %s] %s", r.get("rank", "?"), r.get("title", "")[:60])

    if not stories:
        log.error("No valid story briefs — nothing to process")
        sys.exit(1)

    log.info("Processing %d stories through pipeline (dry_run=%s)...", len(stories), args.dry_run)
    success_count = 0
    for i, story in enumerate(stories, 1):
        log.info("=" * 50)
        log.info("[%d/%d] %s", i, len(stories), story["title"])
        if run_pipeline_for_story(story, dry_run=args.dry_run):
            success_count += 1

    log.info("Done. %d/%d published successfully.", success_count, len(stories))
    sys.exit(0 if success_count > 0 else 1)


if __name__ == "__main__":
    main()
