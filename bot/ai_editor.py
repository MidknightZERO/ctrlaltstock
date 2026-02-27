"""
ai_editor.py — Editorial second pass on a draft article.

Improves:
- SEO (keyword density, meta description quality)
- Prose tightness and readability
- Internal links to existing blog posts
- Validates frontmatter completeness

Usage:
    python ai_editor.py   # reads draft JSON from stdin, writes edited JSON to stdout
"""

import json
import sys
import logging
import logging.handlers
from datetime import datetime, timezone
from typing import Dict, Any, List
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_exponential

import config
from ai_writer import call_ai
from utils import sanitize_article_content

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            Path(config.bot.logs_dir) / "ai_editor.log",
            encoding="utf-8", maxBytes=10_000_000, backupCount=3
        ),
    ],
)
log = logging.getLogger(__name__)


SITE_BASE_URL = getattr(config.bot, "site_url", "https://ctrlaltstock.com").rstrip("/")

EDITOR_SYSTEM_PROMPT = f"""You are a senior editor for CtrlAltStock, a UK tech hardware price-tracking blog.

Your job is to improve a draft article by editing it in place. Specifically:

1. **SEO**: Ensure the H1 title contains the main keyword and is SEO-friendly. Ensure the first paragraph contains the main keyword naturally. Check keyword density is 2–3%. Add LSI keywords naturally.

2. **Internal linking (required)**: You will be given a list of existing blog posts with slug, title, tags, and category path (e.g. Hardware > GPU > Nvidia > 5000 Series). Use this to decide which posts are relevant to the current article (same or related category/topic).
   - Where a phrase or sentence in the article naturally matches another post's topic, turn that phrase into a link. Use this exact URL format: [phrase]({SITE_BASE_URL}/blog/SLUG)
   - Do NOT add links inside the H1 title (the first # heading). Only add links in the body: H2/H3 sections, paragraphs, and lists.
   - Use each phrase at most once per article (do not link "driver update" or any phrase twice).
   - Up to 2 links per paragraph, at least one sentence apart (not on the same line or immediately consecutive). Distribute links across the article. Aim for 2–4 links total, spread throughout.
   - If no phrase in the article naturally fits an existing post, add one short line at the end (before any Discord CTA): "If you liked this, check out our article on [post title]({SITE_BASE_URL}/blog/slug)." Use the actual post title and slug from the list. Only add this fallback when you could not place any inline links.
   - All internal links must use the full URL: {SITE_BASE_URL}/blog/SLUG

3. **Temporal accuracy**: The article has a publication date (provided in the prompt). Any reference to a specific year must be consistent with that date. Update outdated year references so the article does not read as if today is in the past.

4. **Pricing**: All prices must be in GBP (£). Our audience is UK. Convert or replace any USD with pounds sterling.

5. **Length**: Do NOT shorten the article. Return the FULL article with your edits applied. Preserve all sections and at least 900 words. If the draft is long, keep it long—only improve wording, add links, and fix issues. Never return a summary or condensed version.

Return ONLY the improved article markdown. No commentary. No JSON metadata. Just the complete article text.
"""


BLOG_CATEGORIES_PATH = Path(config.git.repo_path) / "public" / "blog-categories.json"


def load_categories() -> Dict[str, List[str]]:
    """Load slug -> categoryPath from public/blog-categories.json."""
    if not BLOG_CATEGORIES_PATH.exists():
        return {}
    try:
        data = json.loads(BLOG_CATEGORIES_PATH.read_text(encoding="utf-8"))
        return data.get("categories", {})
    except Exception as e:
        log.warning("Could not load blog-categories.json: %s", e)
        return {}


def load_existing_posts() -> List[Dict[str, Any]]:
    """Load existing blog posts with category paths for internal linking."""
    json_path = Path(config.git.repo_path) / config.bot.blog_json_path
    categories = load_categories()
    if not json_path.exists():
        log.warning("blog-posts.json not found at %s — skipping internal links", json_path)
        return []
    try:
        posts = json.loads(json_path.read_text(encoding="utf-8"))
        result = []
        for p in posts:
            slug = p.get("slug", "")
            cat_path = categories.get(slug)
            if not cat_path and p.get("tags"):
                # Infer flat category from first tag + Hardware/Guides/News
                cat_path = ["Hardware" if any(t in " ".join(p.get("tags", [])).lower() for t in ("gpu", "cpu", "ram", "ssd", "monitor")) else "Guides"] + [str(t) for t in (p.get("tags") or [])[:3]]
            result.append({
                "slug": slug,
                "title": p.get("title", ""),
                "tags": p.get("tags", []),
                "categoryPath": cat_path or ["Guides"],
                "excerpt": (p.get("excerpt") or "")[:150],
            })
        return result
    except Exception as e:
        log.error("Could not load blog-posts.json: %s", e)
        return []


def build_editor_prompt(
    draft: Dict[str, Any],
    existing_posts: List[Dict],
    content: str,
    is_retry: bool = False,
) -> str:
    """Build editor prompt. content is the article text to edit (may be previous attempt on retry)."""
    posts_list = "\n".join(
        "slug: {} | title: {} | category: {} | tags: {}".format(
            p.get("slug", ""),
            p.get("title", ""),
            " > ".join(p.get("categoryPath") or []),
            ", ".join(str(t) for t in p.get("tags") or []),
        )
        for p in existing_posts[:40]
    )
    pub_date = draft.get("frontmatter", {}).get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    word_count = len((content or "").split())
    retry_note = ""
    if is_retry:
        retry_note = "\nIMPORTANT: Your previous attempt was too short. Expand the article below to at least 900 words while preserving all content, internal links, and edits. Do not remove or condense anything.\n\n"
    return f"""Please review and improve this draft article.
{retry_note}PUBLICATION DATE: {pub_date} (treat this as "today" for any year/date references in the article).
DRAFT LENGTH: {word_count} words. Return the FULL article with your edits—do not shorten. Keep at least 900 words.

EXISTING BLOG POSTS (use for internal links; match by category and topic; link URL = {SITE_BASE_URL}/blog/ slug):
{posts_list or "(None yet — add no internal links)"}

DRAFT ARTICLE:
---
{content}
---

Remember: return ONLY the complete improved article markdown (full length). Use full URLs {SITE_BASE_URL}/blog/SLUG for every internal link. Nothing else.
"""


def strip_prompt_leakage(text: str) -> str:
    """
    Remove lines that look like prompt instructions or metadata leaked by the model.
    Only removes lines that start with known instruction prefixes (case-insensitive).
    """
    if not text or not text.strip():
        return text
    start_patterns = (
        "publication date:",
        "brand voice:",
        "existing blog posts",
        "draft article:",
        "remember:",
    )
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        if any(lower.startswith(p) for p in start_patterns):
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


MIN_EDITOR_WORDS = 900
MIN_EDITOR_RATIO = 0.8  # Reject editor output if below 80% of input length
MAX_EDITOR_ATTEMPTS = 3


def run_editorial_pass(draft: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the editorial AI pass on a draft article dict.
    Retries up to MAX_EDITOR_ATTEMPTS; on retry feeds previous output back and asks to expand.
    If all return too-short content, keeps pre-editor content (no internal links).
    """
    existing_posts = load_existing_posts()
    content_to_edit = draft.get("content") or ""
    input_word_count = len(content_to_edit.split())
    title = draft["frontmatter"].get("title", "Unknown")

    improved_content = None
    for attempt in range(1, MAX_EDITOR_ATTEMPTS + 1):
        log.info("Running editorial pass on: %s (attempt %d/%d)", title, attempt, MAX_EDITOR_ATTEMPTS)
        prompt = build_editor_prompt(draft, existing_posts, content_to_edit, is_retry=(attempt > 1))
        raw = call_ai(prompt, system=EDITOR_SYSTEM_PROMPT)
        candidate = strip_prompt_leakage(raw)
        output_word_count = len(candidate.split())
        if output_word_count >= MIN_EDITOR_WORDS and (input_word_count <= 0 or output_word_count >= input_word_count * MIN_EDITOR_RATIO):
            improved_content = candidate
            break
        log.warning(
            "Editor attempt %d/%d returned too-short content (%d words, input %d). Retrying with expand instruction.",
            attempt, MAX_EDITOR_ATTEMPTS, output_word_count, input_word_count,
        )
        content_to_edit = candidate  # Feed previous output back for next attempt

    if improved_content is None:
        log.warning(
            "Editor failed all %d attempts (too-short). Keeping pre-editor content (no internal links).",
            MAX_EDITOR_ATTEMPTS,
        )
        improved_content = draft.get("content", "")

    # Strip ```markdown wrappers and redundant leading H1 — AI sometimes returns these
    title = draft.get("frontmatter", {}).get("title", "")
    improved_content = sanitize_article_content(improved_content, title)

    edited = dict(draft)
    edited["content"] = improved_content.strip()

    if not edited["frontmatter"].get("excerpt"):
        lines = [l.strip() for l in improved_content.split("\n") if l.strip() and not l.startswith("#")]
        if lines:
            edited["frontmatter"]["excerpt"] = lines[0][:200]

    return edited


if __name__ == "__main__":
    draft = json.loads(sys.stdin.read())
    result = run_editorial_pass(draft)
    print(json.dumps(result, indent=2, ensure_ascii=False))
