"""
Shared utilities for the blog bot pipeline.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path


def strip_markdown_from_title(title: str) -> str:
    """
    Remove leading markdown heading syntax (#, ##, ###, etc.) from a title.
    AI sometimes returns suggested_title with '# Title' — this must never reach the frontmatter.
    """
    if not title or not isinstance(title, str):
        return title or ""
    return re.sub(r"^#+\s*", "", title.strip()).strip()


def sanitize_article_content(content: str, title: str = "") -> str:
    """
    Strip AI artifacts from article content that cause bad rendering:
    - ```markdown / ``` wrappers (content gets shown as raw code)
    - Redundant leading H1 that duplicates the post title
    """
    if not content or not content.strip():
        return content or ""

    text = content.strip()

    # Strip fenced code block wrappers (```markdown ... ``` or ``` ... ```)
    for lang in ("markdown", "md", ""):
        prefix = f"```{lang}".strip() if lang else "```"
        if text.lower().startswith(prefix):
            text = text[len(prefix):].lstrip("\n")
            break
    if text.rstrip().endswith("```"):
        text = text.rstrip()[:-3].rstrip()

    # Remove redundant leading H1 (duplicates title; causes "# Title" to show as raw text)
    first_line = text.split("\n")[0].strip()
    if re.match(r"^#+\s+.+", first_line):
        rest = "\n".join(text.split("\n")[1:]).lstrip()
        text = rest

    return text.strip()


def save_partial_draft(draft: dict, story: dict, run_id: str, last_step: str, error: str, drafts_dir: str) -> Path | None:
    """Save partial draft to drafts_dir so it can be resumed. Returns path if saved."""
    if not draft or not story:
        return None
    d = Path(drafts_dir)
    d.mkdir(parents=True, exist_ok=True)
    slug = draft.get("frontmatter", {}).get("slug") or draft.get("slug") or "untitled"
    safe_slug = "".join(c if c.isalnum() or c in "-_" else "_" for c in slug)[:60]
    filename = f"{run_id}_{safe_slug}.json"
    filepath = d / filename
    try:
        payload = {
            "draft": draft,
            "story": story,
            "run_id": run_id,
            "last_completed_step": last_step,
            "error": error,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        filepath.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return filepath
    except Exception:
        return None
