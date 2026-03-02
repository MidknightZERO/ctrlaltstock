"""
Shared utilities for the blog bot pipeline.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

# ── Pipeline log (single file for all scripts) ─────────────────────────────────
_PIPELINE_LOG_PATH: Path | None = None


def pipeline_log(message: str, script_name: str = "pipeline") -> None:
    """Append one line to bot/logs/pipeline.log. Format: [ISO timestamp] [SCRIPT] message"""
    global _PIPELINE_LOG_PATH
    try:
        if _PIPELINE_LOG_PATH is None:
            try:
                import config
                log_dir = Path(config.bot.logs_dir)
            except Exception:
                log_dir = Path(__file__).parent / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            _PIPELINE_LOG_PATH = log_dir / "pipeline.log"
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        line = f"[{ts}] [{script_name}] {message}\n"
        with open(_PIPELINE_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def infer_primary_topic(draft: Dict[str, Any]) -> str:
    """
    Infer the article's primary topic from title, content, and tags.
    Returns "gpu" | "cpu" | "console" | "storage" | "streaming" | "general".
    Prefers content/title signals over tags (e.g. FSR4/Vulkan = GPU even if CPU in tags).
    NVIDIA+Shield: "NVIDIA Shield TV" -> streaming, not gpu.
    """
    title = (draft.get("frontmatter", {}).get("title") or draft.get("title") or "")
    content = draft.get("content", "") or ""
    tags = [str(t).lower() for t in (draft.get("frontmatter", {}).get("tags") or draft.get("tags") or [])]
    combined = f"{title} {content}".lower()
    title_lower = title.lower()

    # Title-first: streaming (NVIDIA Shield, etc.) — title overrides content
    if "shield" in title_lower or "shield tv" in title_lower or "shield pro" in title_lower:
        return "streaming"
    streaming_in_title = any(sig in title_lower for sig in ["fire tv", "roku", "chromecast", "streaming stick", "android tv"])
    if streaming_in_title:
        return "streaming"

    # Strong GPU signals (title/content)
    gpu_signals = [
        "fsr", "fsr2", "fsr3", "fsr4", "vulkan", "directx", "radeon",
        "rx 7", "rx 9", "rx 7900", "rx 7800", "rx 7600",
        "rtx 50", "rtx 40", "rtx 30", "gtx ", "graphics card", " gpu ",
        "dlss", "ray tracing", "adrenalin", "geforce",
    ]
    for sig in gpu_signals:
        if sig in combined:
            return "gpu"

    # Strong CPU signals (only if no GPU signal)
    cpu_signals = ["ryzen", "zen 5", "zen 6", "core i", "processor", "olympic ridge", "granite ridge"]
    for sig in cpu_signals:
        if sig in combined:
            return "cpu"

    # Game/deal signals (before console — game deal articles get game products, not GPUs)
    game_deal_signals = ["avatar", "game deal", "amazon deal", "£9.99", "flash sale", "price drop"]
    if any(sig in combined for sig in game_deal_signals):
        if "gpu" not in combined and "graphics" not in combined and "rtx" not in combined:
            return "game"
    if "deals" in tags or "gaming" in tags:
        if any(kw in combined for kw in ["game", "avatar", "nintendo", "switch game"]):
            return "game"

    # Console signals
    console_signals = ["playstation", "ps5", "ps4", "xbox", "nintendo", "switch", "steam deck", "rog ally"]
    for sig in console_signals:
        if sig in combined:
            return "console"

    # Storage signals
    storage_signals = ["ssd", "nvme", "storage drive"]
    for sig in storage_signals:
        if sig in combined:
            return "storage"

    # Streaming signals (NVIDIA Shield, Fire TV, Roku, Chromecast, etc.)
    streaming_signals = [
        "shield tv", "shield pro", "fire tv", "roku", "chromecast",
        "streaming stick", "android tv",
    ]
    for sig in streaming_signals:
        if sig in combined:
            return "streaming"
    # NVIDIA + next word: "nvidia shield" -> streaming
    if "nvidia" in combined and "shield" in combined:
        return "streaming"

    # Fall back to tags (order matters: game before gpu; exclude nvidia->gpu when shield in title)
    if "deals" in tags and any(k in tags for k in ["gaming", "game", "nintendo", "switch"]):
        return "game"
    if "gpu" in tags or "graphics" in tags or "radeon" in tags:
        return "gpu"
    if "nvidia" in tags and "shield" not in combined:
        return "gpu"
    if "cpu" in tags or "ryzen" in tags or "intel" in tags:
        return "cpu"
    if any(c in tags for c in ["playstation", "ps5", "xbox", "nintendo", "switch", "steam deck"]):
        return "console"
    if "ssd" in tags or "storage" in tags:
        return "storage"
    if "shield" in tags or "streaming" in tags:
        return "streaming"

    return "general"


def strip_excerpt_prompt_artifacts(text: str) -> str:
    """Remove **Hook:**, ## Hook:, and <!-- featured-product ... --> from excerpt or one-line preview."""
    if not text or not text.strip():
        return text or ""
    s = text.strip()
    s = re.sub(r"^\s*\*\*Hook\*\*\s*[–\-:]?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^\s*##\s*Hook\s*:\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"<!--\s*featured-product\s*:[^>]*-->", "", s, flags=re.IGNORECASE | re.DOTALL)
    return s.strip()


def strip_markdown_from_title(title: str) -> str:
    """
    Remove leading markdown heading syntax (#, ##, ###, etc.) from a title.
    AI sometimes returns suggested_title with '# Title' — this must never reach the frontmatter.
    """
    if not title or not isinstance(title, str):
        return title or ""
    return re.sub(r"^#+\s*", "", title.strip()).strip()


def strip_title_bracket_suffix(title: str) -> str:
    """
    Remove trailing editor notes in brackets, e.g. "Eternal Threads [Story-driven first-person puzzle game]" -> "Eternal Threads".
    """
    if not title or not isinstance(title, str):
        return title or ""
    t = title.strip()
    if re.search(r"\s+\[[^\]]+\]\s*$", t):
        return re.sub(r"\s+\[[^\]]+\]\s*$", "", t).strip()
    return t


# Meta section headings that must be stripped (repair damage / AI filler)
META_SECTION_HEADINGS = (
    "seo optimization",
    "key takeaways",
    "internal links for further reading",
    "summary",
)


def strip_meta_sections_by_heading(text: str) -> str:
    """
    Remove whole sections whose heading is a known meta/repair-artifact heading
    (e.g. # SEO Optimization, # Key Takeaways, # Internal Links for Further Reading, # Summary).
    Removes the heading and all content until the next # heading or end.
    """
    if not text or not text.strip():
        return text or ""
    lines = text.split("\n")
    out: List[str] = []
    skip_until_next_heading = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^#+\s+.+", stripped):
            heading_text = re.sub(r"^#+\s+", "", stripped).strip().lower()
            if heading_text in META_SECTION_HEADINGS:
                skip_until_next_heading = True
                continue
            skip_until_next_heading = False
        if skip_until_next_heading:
            continue
        out.append(line)
    return "\n".join(out).strip()


def strip_ai_meta_commentary(text: str) -> str:
    """
    Remove AI-generated meta-commentary paragraphs that describe the article/editing process
    (e.g. "This article, totaling over X words, has been meticulously expanded...",
     "Internal links have been seamlessly integrated...", "optimized for SEO..."),
    and paragraphs containing "This expanded version exceeds the 900-word mark" or
    "strategic keyword usage" with "SEO performance".
    """
    if not text or not text.strip():
        return text or ""
    meta_phrases = (
        "totaling over",
        "meticulously expanded",
        "seamlessly integrated",
        "optimized for seo",
        "preserving all original content",
        "enhance readability and navigation",
        "reinforcing the article",
        "competitive tech landscape",
        "requested length while",
        "this expanded version exceeds the 900-word mark",
    )
    seo_meta_paragraph = (
        "strategic keyword usage" in text.lower() and "seo" in text.lower() and "performance" in text.lower()
    )
    paragraphs = re.split(r"\n\s*\n", text)
    out: List[str] = []
    for para in paragraphs:
        stripped = para.strip()
        if not stripped:
            out.append(para)
            continue
        lower = stripped.lower()
        if sum(1 for p in meta_phrases if p in lower) >= 2:
            continue
        if "this expanded version exceeds the 900-word mark" in lower:
            continue
        if "strategic keyword usage" in lower and "seo" in lower:
            continue
        out.append(para)
    return "\n\n".join(out).strip()


def detect_content_issues(content: str) -> Dict[str, Any]:
    """
    Detect formatting and truncation issues that need AI repair.
    Returns dict with:
      - wall_of_text: True if any paragraph is excessively long (no paragraph breaks)
      - truncated_link: True if content ends with an unclosed markdown link (e.g. ](https://... with no ))
    """
    if not content or not content.strip():
        return {"wall_of_text": False, "truncated_link": False}
    text = content.strip()
    issues: Dict[str, Any] = {"wall_of_text": False, "truncated_link": False}

    # Wall of text: stricter bar — only flag severe cases (> 900 chars or > 7 sentence-ends in one block)
    # Avoids flagging normal long paragraphs (600–700 chars) that were previously over-triggering repair
    paragraphs = re.split(r"\n\s*\n", text)
    for p in paragraphs:
        p = p.strip()
        if not p or p.startswith("#") or p.startswith("<!--"):
            continue
        if len(p) > 900:
            issues["wall_of_text"] = True
            break
        # Count sentence-ending punctuation; require > 7 sentence-ends AND > 400 chars
        sentence_ends = len(re.findall(r"[.!?]\s+", p)) + (1 if re.search(r"[.!?]$", p) else 0)
        if sentence_ends > 7 and len(p) > 400:
            issues["wall_of_text"] = True
            break

    # Truncated link: content ends with ](URL but no closing ) — markdown link cut off
    text_rstrip = text.rstrip()
    if re.search(r"\]\(https?://[^\s)]*$", text_rstrip):
        issues["truncated_link"] = True
    else:
        last_bracket = text_rstrip.rfind("](")
        if last_bracket != -1:
            after = text_rstrip[last_bracket + 2:]
            if ")" not in after:
                issues["truncated_link"] = True

    return issues


def fix_truncated_link_deterministic(content: str) -> str:
    """
    Deterministically fix truncated markdown link at end of content.
    If content ends with ](URL but no closing ), remove the whole incomplete link [anchor](url.
    No AI; safe to run on any content.
    """
    if not content or not content.strip():
        return content or ""
    text = content.rstrip()
    last_bracket = text.rfind("](")
    if last_bracket == -1:
        return content
    after = text[last_bracket + 2:]
    if ")" in after:
        return content
    if not re.search(r"\]\(https?://[^\s)]*$", text):
        return content
    start = text.rfind("[", 0, last_bracket)
    if start == -1:
        return text[:last_bracket].rstrip()
    return text[:start].rstrip()


def sanitize_article_content(content: str, title: str = "") -> str:
    """
    Strip AI artifacts from article content that cause bad rendering:
    - ```markdown / ``` wrappers (content gets shown as raw code)
    - Redundant leading H1 that duplicates the post title
    - "**Hook:**" / "## Hook:" prompt leaks and <!-- featured-product ... --> comments
    - AI meta-commentary paragraphs ("This article, totaling over X words, has been meticulously expanded...")
    """
    if not content or not content.strip():
        return content or ""

    text = content.strip()

    # Remove meta sections by heading (SEO Optimization, Key Takeaways, etc.) first
    text = strip_meta_sections_by_heading(text)
    # Remove AI meta-commentary paragraphs before other cleanup
    text = strip_ai_meta_commentary(text)

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

    # Remove prompt-leak lines: **Hook:**, ## Hook:, <!-- featured-product ... -->
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Drop lines that are only Hook header or featured-product comment
        if re.match(r"^\*\*Hook\*\*\s*[–\-:]?\s*$", stripped, re.IGNORECASE):
            continue
        if re.match(r"^##\s*Hook\s*:", stripped, re.IGNORECASE):
            continue
        if "<!--" in stripped and "featured-product" in stripped and re.match(r"^\s*<!--", stripped):
            continue
        # Strip leading **Hook:** or **Hook** – from the line (keep the rest)
        new_line = re.sub(r"^\s*\*\*Hook\*\*\s*[–\-:]?\s*", "", line, flags=re.IGNORECASE)
        new_line = re.sub(r"^\s*##\s*Hook\s*:\s*", "", new_line, flags=re.IGNORECASE)
        # Remove inline <!-- featured-product: ... -->
        new_line = re.sub(r"<!--\s*featured-product\s*:[^>]*-->", "", new_line, flags=re.IGNORECASE | re.DOTALL)
        new_line = new_line.strip()
        if new_line:
            cleaned_lines.append(new_line)
    text = "\n".join(cleaned_lines)

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
