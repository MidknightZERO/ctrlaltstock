"""
validate_existing_content.py — Audit and fix existing markdown posts for content quality.

- H1 links: Strip any links from the first H1 line
- Whole-word links: Report/fix links whose anchor is a substring of a longer word (e.g. "RAM" in "Ramifications")
- Link distribution: Report posts where links are bunched in the first 30% of content
- Image relevance: Report posts where coverImage appears to conflict with primary topic

Writes a machine-readable report to bot/.tmp/validation-report.json for backfill_content.py to use
(distribution-aware linking for posts flagged with link_distribution_skewed).

Usage:
    python bot/validate_existing_content.py           # Report only, write report file
    python bot/validate_existing_content.py --fix     # Apply H1 strip and whole-word link fixes, write report
"""

import json
import re
import sys
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple

import frontmatter as fm

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

# Report path for backfill to reference
VALIDATION_REPORT_DIR = _BOT_DIR / ".tmp"
VALIDATION_REPORT_PATH = VALIDATION_REPORT_DIR / "validation-report.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [validate_existing] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

SITE_BASE_URL = getattr(config.bot, "site_url", "https://ctrlaltstock.com").rstrip("/")


def load_posts() -> List[Tuple[Path, fm.Post]]:
    """Load all markdown posts from posts_dir."""
    posts_dir = Path(config.git.repo_path) / config.bot.posts_dir
    if not posts_dir.exists():
        return []
    result = []
    for p in sorted(posts_dir.glob("*.md")):
        try:
            post = fm.load(p)
            result.append((p, post))
        except Exception as e:
            log.warning("Could not load %s: %s", p.name, e)
    return result


def strip_links_from_h1(content: str) -> str:
    """Remove link markup from the first H1 line. Reused from backfill_content."""
    m = re.search(r"^# .+$", content, re.MULTILINE)
    if not m:
        return content
    h1_line = content[m.start() : m.end()]
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", h1_line)
    if cleaned == h1_line:
        return content
    return content[: m.start()] + cleaned + content[m.end() :]


def fix_h1_links(path: Path, post: fm.Post) -> bool:
    """Strip links from H1. Returns True if changed."""
    content = post.content or ""
    new_content = strip_links_from_h1(content)
    if new_content != content:
        post.content = new_content
        return True
    return False


def find_partial_word_links(content: str, base_url: str) -> List[Tuple[str, str, int, int]]:
    """
    Find internal links whose anchor text is a substring of a longer word.
    Returns [(anchor, url, start, end), ...].
    """
    base_esc = re.escape(base_url)
    pattern = re.compile(r"\[([^\]]+)\]\(\s*" + base_esc + r"/blog/[^)]+\)")
    results = []
    for m in pattern.finditer(content):
        anchor = m.group(1)
        if len(anchor) < 3:
            continue
        # Check if anchor appears as a substring of a longer word (word boundary violation)
        # Look at context around the match - is the anchor surrounded by word chars?
        start, end = m.start(), m.end()
        before = content[max(0, start - 1) : start]
        after = content[end : min(len(content), end + 1)]
        # If char before [ is a word char, or char after ) is a word char, we might have partial match
        # Actually: the issue is the OPPOSITE - we linked "RAM" and it matched inside "Ramifications"
        # So the link text is "RAM" and it's correct in the link. The problem is WHEN we inserted it,
        # we matched "RAM" inside "Ramifications" - so the link would be [Ramifications](url) with
        # only part of the word as the concept. No - the link would be [RAM](url) and the text would
        # show "RAM" - but we'd have replaced "Ramifications" with "Ram[ifications](url)"? No.
        # When we do the replacement: we find "RAM" in "Ramifications", replace with "[RAM](url)"
        # So we'd get "Ramifications" -> "Ram[RAM](url)ifications" - that would be wrong. So we're
        # replacing the substring "RAM" with "[RAM](url)" - so we'd get "Ram[RAM](url)ifications".
        # So the fix is: find links where the anchor is short and could be a substring. For each
        # link [X](url), check if in the original text (if we had it) X was part of a longer word.
        # We don't have the original - we have the current content. So we look for [X](url) and
        # check: is there a word character immediately before the [ or immediately after the )?
        # If before [ we have a letter, then X might be the tail of a word - e.g. "the[RAM](url)"
        # would mean we linked "RAM" at the end of "the" - no. "the RAM" -> "the [RAM](url)" - before
        # [ is space, so ok. "Ramifications" -> we'd have "Ram[RAM](url)ifications" - before [ is 'm'
        # which is a word char. So the heuristic: if the character immediately before the opening [
        # is a word character, the link might be wrong (we linked the end of a word). If the char
        # immediately after the closing ) is a word character, we linked the start of a word.
        before_char = content[start - 1] if start > 0 else " "
        after_char = content[end] if end < len(content) else " "
        if re.match(r"\w", before_char) or re.match(r"\w", after_char):
            results.append((anchor, m.group(0), start, end))
    return results


def fix_partial_word_links(path: Path, post: fm.Post) -> bool:
    """
    Remove links that are partial-word matches (e.g. [RAM](url) inside "Ramifications").
    Replace the link with empty string so adjacent text forms the full word again.
    Returns True if changed.
    """
    content = post.content or ""
    bad_links = find_partial_word_links(content, SITE_BASE_URL)
    if not bad_links:
        return False
    # Replace from end to start to preserve indices; remove link so "Ram" + "[RAM](url)" + "ifications" -> "Ramifications"
    for _anchor, _full_link, s, e in sorted(bad_links, key=lambda x: -x[2]):
        content = content[:s] + content[e:]
    post.content = content
    return True


def check_link_distribution(content: str, base_url: str) -> Tuple[int, float]:
    """
    Return (link_count, fraction_in_first_30_percent).
    If fraction > 0.4, links are bunched.
    """
    base_esc = re.escape(base_url)
    pattern = re.compile(r"\[([^\]]+)\]\(\s*" + base_esc + r"/blog/[^)]+\)")
    matches = list(pattern.finditer(content))
    if not matches:
        return 0, 0.0
    total_len = len(content)
    first_30_end = int(total_len * 0.3)
    in_first = sum(1 for m in matches if m.start() < first_30_end)
    return len(matches), in_first / len(matches) if matches else 0.0


def infer_primary_topic_simple(post: fm.Post) -> str:
    """Infer topic from title + tags. Simplified version of utils.infer_primary_topic."""
    title = (post.get("title") or "").lower()
    tags = " ".join(str(t).lower() for t in (post.get("tags") or []))
    content = (post.content or "").lower()[:500]
    combined = f"{title} {tags} {content}"
    if any(k in combined for k in ["gpu", "rtx", "radeon", "graphics"]):
        return "gpu"
    if any(k in combined for k in ["game", "avatar", "nintendo", "switch game", "deal"]):
        if "gpu" not in combined and "graphics" not in combined:
            return "game"
    if any(k in combined for k in ["xbox", "playstation", "console"]):
        return "console"
    return "general"


def check_image_relevance(post: fm.Post) -> Tuple[bool, str]:
    """
    Heuristic: does coverImage conflict with primary topic?
    Returns (ok: bool, message: str).
    """
    topic = infer_primary_topic_simple(post)
    cover = (post.get("coverImage") or "").lower()
    if not cover:
        return True, "no cover"
    # Simple heuristic: if topic is "game" but URL suggests GPU/hardware
    gpu_signals = ["gpu", "graphics", "radeon", "geforce", "rtx", "rx 7", "rx 9"]
    game_signals = ["game", "nintendo", "switch", "avatar", "console", "controller"]
    if topic == "game":
        if any(s in cover for s in gpu_signals):
            return False, f"topic=game but cover suggests GPU: {cover[:80]}"
    if topic == "gpu":
        if any(s in cover for s in game_signals) and "gpu" not in cover:
            return False, f"topic=gpu but cover suggests game: {cover[:80]}"
    return True, "ok"


def run_validation(fix: bool = False) -> None:
    """Run all validations, optionally apply fixes, and write validation-report.json for backfill."""
    posts = load_posts()
    log.info("Validating %d posts (fix=%s)", len(posts), fix)

    report: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "posts": {},
    }
    h1_fixed = 0
    partial_fixed = 0

    for path, post in posts:
        slug = path.stem
        content = post.content or ""

        h1_changed = False
        partial_changed = False

        # H1 links
        if fix_h1_links(path, post) and fix:
            h1_fixed += 1
            h1_changed = True
            fm.dump(post, path)
            log.info("Fixed H1 links: %s", path.name)
            content = post.content or ""

        # Partial-word links
        if fix_partial_word_links(path, post) and fix:
            partial_fixed += 1
            partial_changed = True
            fm.dump(post, path)
            log.info("Fixed partial-word links: %s", path.name)
            content = post.content or ""

        # Link distribution
        n_links, frac = check_link_distribution(content, SITE_BASE_URL)
        link_distribution_skewed = n_links >= 2 and frac > 0.4
        if link_distribution_skewed:
            log.warning(
                "Link distribution skewed in %s: %.0f%% of links in first 30%% of content",
                path.name,
                frac * 100,
            )

        # Image relevance
        image_ok, image_msg = check_image_relevance(post)
        if not image_ok:
            log.warning("Image relevance: %s — %s", path.name, image_msg)

        report["posts"][slug] = {
            "link_count": n_links,
            "fraction_links_in_first_30": round(frac, 4),
            "link_distribution_skewed": link_distribution_skewed,
            "image_relevance_ok": image_ok,
            "image_message": image_msg,
            "h1_fixed": h1_changed,
            "partial_word_fixed": partial_changed,
        }

    # Write report for backfill to reference
    VALIDATION_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    try:
        VALIDATION_REPORT_PATH.write_text(
            json.dumps(report, indent=2),
            encoding="utf-8",
        )
        log.info("Wrote validation report to %s", VALIDATION_REPORT_PATH)
    except Exception as e:
        log.warning("Could not write validation report: %s", e)

    log.info("Done. H1 fixed=%d, partial-word fixed=%d", h1_fixed, partial_fixed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix", action="store_true", help="Apply fixes (H1 strip, partial-word link removal)")
    args = parser.parse_args()
    run_validation(fix=args.fix)
