"""
validate_topic.py — Validates that generated article body matches the seed story / chosen title.

Uses deterministic word-overlap check: seed title and article title must share a minimum
set of important words with the first 400 words of the body. If overlap is too low, reject.

Called by scheduler after refiner, before editor. Prevents title-body mismatch (e.g. Xbox
title with Avatar body).

Usage:
    Called from scheduler; can also run standalone:
    python validate_topic.py  # reads draft + story from stdin as JSON
"""

import json
import re
import sys
import logging
from typing import Dict, Any, Set

log = logging.getLogger(__name__)

# Minimum fraction of title words that must appear in body for validation to pass
MIN_OVERLAP_RATIO = 0.25
BODY_SAMPLE_WORDS = 400


def _significant_words(text: str) -> Set[str]:
    """Extract significant words (lowercase, alphanumeric, length > 1)."""
    if not text:
        return set()
    normalized = re.sub(r"[^a-z0-9\s]", " ", text.lower()).strip()
    return set(w for w in normalized.split() if len(w) > 1)


def validate_topic_consistency(draft: Dict[str, Any], story: Dict[str, Any]) -> tuple[bool, str]:
    """
    Check that the article body matches the seed story and chosen title.
    Returns (passed: bool, message: str).
    """
    title = (draft.get("frontmatter") or {}).get("title", "")
    content = draft.get("content", "") or ""
    story_title = story.get("title", "")

    if not title and not story_title:
        return False, "No title to validate against"

    # Combine title words from both article and seed
    title_words = _significant_words(title) | _significant_words(story_title)
    if not title_words:
        return True, "No significant title words to check"

    # First N words of body (strip markdown for cleaner matching)
    body_sample = " ".join(content.split()[:BODY_SAMPLE_WORDS])
    body_words = _significant_words(body_sample)

    overlap = len(title_words & body_words) / len(title_words)
    passed = overlap >= MIN_OVERLAP_RATIO

    msg = (
        f"Overlap {overlap:.2f} ({len(title_words & body_words)}/{len(title_words)} title words in body)"
        if passed
        else f"Overlap {overlap:.2f} below threshold {MIN_OVERLAP_RATIO} — body may not match title"
    )
    return passed, msg


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [validate_topic] %(levelname)s %(message)s")
    payload = json.loads(sys.stdin.read())
    draft = payload.get("draft", {})
    story = payload.get("story", {})
    passed, msg = validate_topic_consistency(draft, story)
    result = {"passed": passed, "message": msg}
    print(json.dumps(result, indent=2))
    sys.exit(0 if passed else 1)
