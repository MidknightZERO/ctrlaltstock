"""
Shared utilities for the blog bot pipeline.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any


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
