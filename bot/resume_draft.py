"""
resume_draft.py — Resume and publish a partial draft saved after a pipeline crash.

Partial drafts are saved to bot/.tmp/drafts/ when the pipeline crashes mid-run.
This script loads a draft, continues from the last completed step, and publishes.

Usage:
    python bot/resume_draft.py                    # Resume oldest partial draft
    python bot/resume_draft.py 20260227_075325_untitled.json
    python bot/resume_draft.py --list             # List saved partial drafts
"""

import json
import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone

# Ensure bot dir is on path (for config, ai_editor, etc.)
_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

import config

Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(config.bot.logs_dir) / "resume_draft.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

DRAFTS_DIR = Path(config.bot.drafts_dir)
STEP_ORDER = ["writer", "refiner", "editor", "amazon", "images", "publish"]


def list_drafts() -> list[Path]:
    """Return draft files sorted by saved_at (oldest first)."""
    if not DRAFTS_DIR.exists():
        return []
    files = list(DRAFTS_DIR.glob("*.json"))
    # Sort by mtime (oldest first)
    return sorted(files, key=lambda p: p.stat().st_mtime)


def load_draft(filepath: Path) -> dict | None:
    """Load a partial draft payload. Returns None if invalid."""
    try:
        data = json.loads(filepath.read_text(encoding="utf-8"))
        if "draft" not in data or "story" not in data:
            log.error("Invalid draft file: missing draft or story")
            return None
        return data
    except Exception as e:
        log.error("Could not load draft %s: %s", filepath, e)
        return None


def resume_from_step(draft: dict, story: dict, from_step: str, dry_run: bool = False) -> bool:
    """
    Continue pipeline from the given step. Returns True if published.
    """
    step_idx = STEP_ORDER.index(from_step) if from_step in STEP_ORDER else -1
    next_step_idx = step_idx + 1

    for i in range(next_step_idx, len(STEP_ORDER)):
        step = STEP_ORDER[i]
        log.info("[Resume] Running step: %s", step)

        try:
            if step == "editor":
                from ai_editor import run_editorial_pass
                draft = run_editorial_pass(draft)
            elif step == "amazon":
                from amazon_linker import find_products_for_article
                draft = find_products_for_article(draft)
            elif step == "images":
                from image_fetcher import fetch_images
                draft = fetch_images(draft)
            elif step == "publish":
                final_word_count = len(draft["content"].split())
                min_words = getattr(config.bot, "article_min_words", 800)
                if final_word_count < min_words:
                    log.error("Draft below minimum length (%d < %d). Refusing to publish.", final_word_count, min_words)
                    return False
                from publisher import publish
                success = publish(draft, dry_run=dry_run)
                if success and not dry_run:
                    from scraper import mark_story_seen
                    mark_story_seen(story)
                return success
        except Exception as e:
            log.error("Resume failed at step %s: %s", step, e, exc_info=True)
            from utils import save_partial_draft
            run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            save_partial_draft(draft, story, run_id, STEP_ORDER[i - 1] if i > 0 else from_step, str(e), config.bot.drafts_dir)
            return False

    return False


def main():
    parser = argparse.ArgumentParser(description="Resume a partial draft from .tmp/drafts")
    parser.add_argument("filename", nargs="?", help="Draft filename (e.g. 20260227_075325_slug.json)")
    parser.add_argument("--list", action="store_true", help="List saved partial drafts")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files or push")
    args = parser.parse_args()

    if args.list:
        drafts = list_drafts()
        if not drafts:
            print("No partial drafts found in", DRAFTS_DIR)
            return 0
        print("Partial drafts (oldest first):")
        for p in drafts:
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                title = data.get("draft", {}).get("frontmatter", {}).get("title", "?")
                step = data.get("last_completed_step", "?")
                err = data.get("error", "")[:50]
                print(f"  {p.name}  |  {title[:40]}  |  after {step}  |  {err}...")
            except Exception:
                print(f"  {p.name}  (invalid)")
        return 0

    if args.filename:
        filepath = DRAFTS_DIR / args.filename
        if not filepath.exists():
            filepath = Path(args.filename)
        if not filepath.exists():
            log.error("Draft file not found: %s", args.filename)
            return 1
    else:
        drafts = list_drafts()
        if not drafts:
            log.error("No partial drafts found. Run the pipeline first; drafts are saved on crash.")
            return 1
        filepath = drafts[0]
        log.info("Resuming oldest draft: %s", filepath.name)

    payload = load_draft(filepath)
    if not payload:
        return 1

    draft = payload["draft"]
    story = payload["story"]
    last_step = payload.get("last_completed_step", "writer")

    log.info("Resuming draft: %s (last completed: %s)", draft.get("frontmatter", {}).get("title", "?"), last_step)

    success = resume_from_step(draft, story, last_step, dry_run=args.dry_run)
    if success and not args.dry_run:
        try:
            filepath.unlink()
            log.info("Removed completed draft file: %s", filepath.name)
        except Exception as e:
            log.warning("Could not remove draft file: %s", e)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
