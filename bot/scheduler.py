"""
scheduler.py — Orchestrator that runs the full blog pipeline on a schedule.

Pipeline (per run):
  1. scraper.py     → get best story (StoryBrief)
  2. ai_writer.py   → draft article
  3. ai_refiner.py  → refine with relevant info
  4. ai_editor.py   → editorial pass + internal linking
  5. image_fetcher.py → fetch images
  6. amazon_linker.py → find Amazon products
  7. publisher.py   → write .md, git push, notify Discord

Can be run:
  - As a daemon (loops with --daemon flag, runs every 30 minutes via schedule library)
  - As a one-shot (--once flag, useful for cron)
  - As a dry run (--dry-run flag, no actual file writes or git pushes)

RECOMMENDED: Use OS cron (or Windows Task Scheduler) to call `python scheduler.py --once`
every 30 minutes. This creates 3 new blog posts per run from the top 3 stories.

Cron example (every 30 minutes):
  */30 * * * * cd /path/to/repo && python bot/scheduler.py --once >> bot/logs/cron.log 2>&1

See bot/CRON-SETUP.md for full setup instructions.
"""

import json
import sys
import logging
import argparse
import time
from datetime import datetime, timezone
from pathlib import Path

import schedule
from tenacity import retry, stop_after_attempt, wait_fixed

import config

# ── Logging ───────────────────────────────────────────────────────────────────
Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(config.bot.logs_dir) / "scheduler.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ── Import pipeline modules ───────────────────────────────────────────────────

def run_pipeline_for_story(story: dict, dry_run: bool = False) -> bool:
    """
    Execute the full blog generation pipeline for a single story.
    Returns True on success, False on failure.
    """
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log.info("=" * 60)
    log.info("Pipeline run started: %s (dry_run=%s)", run_id, dry_run)
    log.info("Story: %s", story.get("title", "")[:60])
    log.info("=" * 60)

    try:

        # ── Step 1: AI Writer ──────────────────────────────────────────────
        log.info("[1/6] Writing article with AI...")
        from ai_writer import write_article
        try:
            draft = write_article(story)
        except ValueError as e:
            log.error("Writer aborted: %s — not publishing empty or short content", e)
            return False
        word_count = len(draft["content"].split())
        log.info("Article drafted: %d words", word_count)

        # ── Step 3: Refiner ───────────────────────────────────────────────
        log.info("[2/6] Refining article with relevant info...")
        from ai_refiner import refine_article
        try:
            draft = refine_article(draft)
        except ValueError as e:
            log.error("Refiner aborted: %s — not padding short draft", e)
            return False
        log.info("Article refined: %d words", len(draft["content"].split()))

        # ── Step 3: Editorial pass (incl. internal linking) ─────────────────
        log.info("[3/6] Running editorial pass...")
        from ai_editor import run_editorial_pass
        draft = run_editorial_pass(draft)

        # ── Step 4: Amazon links (before images so we can use product images) ─
        log.info("[4/6] Finding Amazon affiliate products...")
        from amazon_linker import find_products_for_article
        draft = find_products_for_article(draft)
        n_products = len(draft["frontmatter"].get("amazonProducts", []))
        log.info("Amazon products found: %d", n_products)

        # ── Step 5: Fetch images (prefer Amazon product images when available) ─
        log.info("[5/6] Fetching images...")
        from image_fetcher import fetch_images
        draft = fetch_images(draft)
        cover = draft["frontmatter"].get("coverImage", "none")
        log.info("Cover image: %s", cover[:60] if cover else "none")

        # ── Pre-publish: refuse to publish thin content ───────────────────
        final_word_count = len(draft["content"].split())
        min_words = getattr(config.bot, "article_min_words", 800)
        if final_word_count < min_words:
            log.error(
                "Article below minimum length (%d < %d words). Refusing to publish to avoid thin/padded content.",
                final_word_count, min_words,
            )
            return False

        # ── Step 7: Publish ───────────────────────────────────────────────
        log.info("[6/6] Publishing article...")
        from publisher import publish
        success = publish(draft, dry_run=dry_run)

        if success and not dry_run:
            from scraper import mark_story_seen
            mark_story_seen(story)

        if success:
            log.info("[SUCCESS] Pipeline completed successfully: %s", draft["frontmatter"].get("title", ""))
        else:
            log.error("[ERROR] Pipeline: publish step failed")

        return success

    except Exception as e:
        log.error("[ERROR] Pipeline crashed: %s", e, exc_info=True)
        # Try to send Discord alert
        try:
            from publisher import notify_discord
            notify_discord("Pipeline Run", "unknown", success=False, error=str(e))
        except Exception:
            pass
        return False
    finally:
        log.info("Pipeline run finished: %s", run_id)


# ── Main entry: get top 3, run pipeline for each ─────────────────────────────

ARTICLES_PER_RUN = int(getattr(config.bot, "articles_per_run", 3))


def run_pipeline(dry_run: bool = False) -> bool:
    """
    Get top N stories from pulled data, run full pipeline for each.
    Returns True if at least one article was published successfully.
    """
    from scraper import get_top_stories

    log.info("Fetching top %d stories from pulled data...", ARTICLES_PER_RUN)
    stories = get_top_stories(n=ARTICLES_PER_RUN, dry_run=dry_run)
    if not stories:
        log.warning("No stories found — skipping this run")
        return False

    success_count = 0
    for i, story in enumerate(stories):
        log.info("[%d/%d] Processing: %s", i + 1, len(stories), story.get("title", "")[:60])
        if run_pipeline_for_story(story, dry_run=dry_run):
            success_count += 1

    if success_count > 0 and not dry_run:
        log.info("Running backfill (inline images, featured product)...")
        try:
            from backfill_content import run_backfill
            run_backfill(tags=False, links=False, amazon_links=False, inline_images=True)
        except Exception as e:
            log.warning("Backfill failed (non-fatal): %s", e)

        log.info("Pushing commits to remote...")
        try:
            from publisher import git_commit_and_push
            git_commit_and_push(config.git.repo_path, "cron: backfill + new posts")
        except Exception as e:
            log.warning("Git push failed (non-fatal): %s", e)

    log.info("Run complete: %d/%d articles published", success_count, len(stories))
    return success_count > 0


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CtrlAltStock Blog Bot Scheduler")
    parser.add_argument("--once", action="store_true", help="Run the pipeline once and exit (use this with cron)")
    parser.add_argument("--daemon", action="store_true", help="Run as a daemon, executing every hour")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files or push to git")
    args = parser.parse_args()

    if not args.once and not args.daemon:
        # Default: --once
        args.once = True

    if args.once:
        log.info("Running pipeline once (dry_run=%s)...", args.dry_run)
        success = run_pipeline(dry_run=args.dry_run)
        sys.exit(0 if success else 1)

    elif args.daemon:
        log.info("Starting daemon mode — will run pipeline every 30 minutes")
        # Run immediately, then every 30 minutes
        run_pipeline(dry_run=args.dry_run)
        schedule.every(30).minutes.do(run_pipeline, dry_run=args.dry_run)

        while True:
            schedule.run_pending()
            time.sleep(30)
