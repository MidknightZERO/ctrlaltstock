"""
image_fetcher.py — Fetches relevant images for blog articles.

Sources:
  1. Unsplash API (free, CC license, no download required — CDN URLs)
  2. Tag-hierarchy-aligned stock_images.json (curated Unsplash URLs)
  3. Anti-reuse: tracks recently used images in used_images.json

Returns image URLs directly embedded in the article frontmatter.

Usage:
    python image_fetcher.py --query "RTX 4090 graphics card"
"""

import sys
import json
import logging
import argparse
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

import config
from utils import infer_primary_topic

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [image_fetcher] %(levelname)s %(message)s")

UNSPLASH_BASE = "https://api.unsplash.com"

# Paths
BOT_DIR = Path(__file__).parent
STOCK_IMAGES_PATH = BOT_DIR / "stock_images.json"
USED_IMAGES_PATH = BOT_DIR / "used_images.json"
USED_IMAGES_MAX = 50  # Track last N used URLs

# Tag -> main group mapping (mirrors tagHierarchy)
TAG_TO_MAIN: Dict[str, str] = {
    "gpu": "Hardware",
    "graphics cards": "Hardware",
    "graphics card": "Hardware",
    "nvidia": "Hardware",
    "amd": "Hardware",
    "cpu": "Hardware",
    "ram": "Hardware",
    "ssd": "Hardware",
    "storage": "Hardware",
    "motherboard": "Hardware",
    "monitor": "Display",
    "monitors": "Display",
    "display": "Display",
    "playstation": "Console",
    "ps5": "Console",
    "xbox": "Console",
    "steam deck": "Console",
    "nintendo": "Console",
    "console": "Console",
    "gaming": "Software",
    "software": "Software",
    "drivers": "Software",
    "deals": "Deals",
    "game": "Deals",
    "game deals": "Deals",
}


def _load_stock_images() -> Dict[str, Any]:
    """Load tag-hierarchy-aligned stock images."""
    if not STOCK_IMAGES_PATH.exists():
        log.warning("stock_images.json not found at %s — using minimal fallback", STOCK_IMAGES_PATH)
        return {
            "default": [
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200",
                "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200",
            ]
        }
    try:
        return json.loads(STOCK_IMAGES_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        log.error("Failed to load stock_images.json: %s", e)
        return {"default": ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"]}


def _load_used_images() -> List[str]:
    """Load list of recently used image URLs."""
    if not USED_IMAGES_PATH.exists():
        return []
    try:
        data = json.loads(USED_IMAGES_PATH.read_text(encoding="utf-8"))
        return data.get("urls", [])[:USED_IMAGES_MAX]
    except Exception:
        return []


def _save_used_images(urls: List[str]) -> None:
    """Persist recently used image URLs (atomic write)."""
    try:
        tmp = USED_IMAGES_PATH.with_suffix('.json.tmp')
        tmp.write_text(
            json.dumps({"urls": urls[:USED_IMAGES_MAX]}, indent=2),
            encoding="utf-8",
        )
        import os
        os.replace(str(tmp), str(USED_IMAGES_PATH))
    except Exception as e:
        log.warning("Could not save used_images.json: %s", e)


def _load_recent_cover_images(days: int) -> Set[str]:
    """Load cover image base URLs from posts published in the last N days. Exclude these when picking new images."""
    json_path = Path(config.git.repo_path) / config.bot.blog_json_path
    if not json_path.exists():
        return set()
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        bases = set()
        for post in data if isinstance(data, list) else []:
            pub = post.get("publishedDate", "")
            if pub and pub >= cutoff:
                url = post.get("coverImage", "")
                if url:
                    bases.add(url.split("?")[0])
        return bases
    except Exception as e:
        log.warning("Could not load recent cover images from blog-posts.json: %s", e)
        return set()


def _get_pool_for_primary_topic(primary: str, stock: Dict[str, Any]) -> List[str]:
    """Get image pool by primary topic. Prefer topic-specific pool over generic."""
    if primary == "gpu" and "Hardware" in stock and isinstance(stock["Hardware"], dict):
        subs = stock["Hardware"]
        if "Graphics Cards" in subs and isinstance(subs["Graphics Cards"], list) and subs["Graphics Cards"]:
            return subs["Graphics Cards"]
        if "default" in subs and isinstance(subs["default"], list):
            return subs["default"]
    if primary == "cpu" and "Hardware" in stock and isinstance(stock["Hardware"], dict):
        subs = stock["Hardware"]
        if "CPU" in subs and isinstance(subs["CPU"], list) and subs["CPU"]:
            return subs["CPU"]
        if "default" in subs and isinstance(subs["default"], list):
            return subs["default"]
    if primary == "console" and "Console" in stock and isinstance(stock["Console"], dict):
        if "default" in stock["Console"] and isinstance(stock["Console"]["default"], list):
            return stock["Console"]["default"]
    if primary == "storage" and "Hardware" in stock and isinstance(stock["Hardware"], dict):
        subs = stock["Hardware"]
        if "Storage" in subs and isinstance(subs["Storage"], list) and subs["Storage"]:
            return subs["Storage"]
        if "default" in subs and isinstance(subs["default"], list):
            return subs["default"]
    if primary == "streaming":
        if "Display" in stock and isinstance(stock["Display"], dict) and "default" in stock["Display"]:
            d = stock["Display"]["default"]
            if isinstance(d, list) and d:
                return d
        if "default" in stock and isinstance(stock["default"], list):
            return stock["default"]
    if primary in ("game", "deals") and "Deals" in stock and isinstance(stock["Deals"], dict):
        if "default" in stock["Deals"] and isinstance(stock["Deals"]["default"], list):
            return stock["Deals"]["default"]
    return []


def _get_pool_for_tags(tags: List[str], stock: Dict[str, Any]) -> List[str]:
    """Get image pool from stock_images.json based on article tags."""
    tags_lower = [t.lower() for t in tags]
    for tag in tags_lower:
        main = TAG_TO_MAIN.get(tag)
        if main and main in stock and isinstance(stock[main], dict):
            subs = stock[main]
            # Try exact subcategory match first
            for sub, urls in subs.items():
                if sub.lower() in tags_lower or tag in sub.lower():
                    if isinstance(urls, list) and urls:
                        return urls
            # Fall back to main group default
            if "default" in subs and isinstance(subs["default"], list):
                return subs["default"]
    # Fall back to top-level default
    if "default" in stock and isinstance(stock["default"], list):
        return stock["default"]
    return []


def _pick_least_recently_used(
    pool: List[str],
    used: List[str],
    count: int,
    exclude_bases: Optional[Set[str]] = None,
) -> List[str]:
    """Pick images from pool, preferring those not in used. Exclude used and exclude_bases; if exhausted, use least-recent."""
    exclude_bases = exclude_bases or set()

    def norm(u: str) -> str:
        base = u.split("?")[0]
        return base + "?w=1200" if "?" not in u else u

    pool_full = [norm(p) for p in pool if p]
    used_bases = {u.split("?")[0] for u in used} | exclude_bases
    unused = [p for p in pool_full if p.split("?")[0] not in used_bases]
    used_ordered = [b for b in (u.split("?")[0] for u in used) if b not in exclude_bases]

    result: List[str] = []
    for _ in range(count):
        if unused:
            result.append(unused.pop(0))
        elif used_ordered:
            base = used_ordered.pop()
            result.append(base + "?w=1200")
        else:
            break
    return result


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
def search_unsplash(query: str, count: int = 3) -> List[str]:
    """Search Unsplash for images matching a query. Returns list of CDN URLs."""
    if not config.unsplash.access_key:
        log.info("No Unsplash API key — using tag-hierarchy stock images")

    try:
        resp = httpx.get(
            f"{UNSPLASH_BASE}/search/photos",
            params={
                "query": query,
                "per_page": count,
                "orientation": "landscape",
                "content_filter": "high",
            },
            headers={"Authorization": f"Client-ID {config.unsplash.access_key}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        urls = []
        for result in data.get("results", []):
            url = result.get("urls", {}).get("regular", "")
            if url:
                urls.append(f"{url}&utm_source=ctrlaltstock&utm_medium=referral")
        return urls
    except Exception as e:
        log.debug("Unsplash search failed: %s", e)
        return []


def fetch_images(draft: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fetch images for an article draft.
    Prefers query-based images (Unsplash from image_search_queries) for cover to avoid
    same product image on every post; then Amazon product images; then stock.
    Excludes cover images used in the past 7 days.
    """
    title = draft["frontmatter"].get("title", "")
    tags = draft["frontmatter"].get("tags", [])
    primary_topic = infer_primary_topic(draft)
    lookback_days = getattr(config.bot, "image_reuse_lookback_days", 7)
    recent_cover_bases = _load_recent_cover_images(lookback_days)
    all_images: List[str] = []
    stock = _load_stock_images()
    used = _load_used_images()

    # 1. Prefer Unsplash from image_search_queries (or title) for cover — avoids same Amazon image on every post
    queries = draft.get("image_search_queries") or [title] + (draft.get("amazon_search_queries") or [])[:2]
    if config.unsplash.access_key and queries:
        for query in queries:
            clean_query = _clean_query_for_images(query, primary_topic)
            images = search_unsplash(clean_query, count=3)
            for img in images:
                base = img.split("?")[0]
                if base not in recent_cover_bases and img not in all_images:
                    all_images.append(img)
                if len(all_images) >= 4:
                    break
            if len(all_images) >= 4:
                break

    # 2. Add Amazon product images — topic-matched, skip recently used
    products = draft["frontmatter"].get("amazonProducts") or []
    if primary_topic == "streaming":
        products = [p for p in products if (p.get("category") or "").lower() != "gpu"]
    def topic_sort_key(p: Dict[str, Any]) -> int:
        cat = (p.get("category") or "").lower()
        if primary_topic == "gpu" and cat == "gpu":
            return 0
        if primary_topic == "cpu" and cat == "cpu":
            return 0
        if primary_topic == "console" and "console" in cat:
            return 0
        if primary_topic == "storage" and ("storage" in cat or "ssd" in cat):
            return 0
        return 1
    sorted_products = sorted(products, key=topic_sort_key)
    for p in sorted_products:
        img = p.get("imageUrl") or ""
        if not img:
            continue
        base = img.split("?")[0]
        if base in recent_cover_bases:
            continue
        if img not in all_images:
            all_images.append(img)
        if len(all_images) >= 4:
            break

    # 3. Fall back to topic-aligned stock images if we still need more
    if len(all_images) < 2:
        pool = _get_pool_for_primary_topic(primary_topic, stock)
        if not pool:
            pool = _get_pool_for_tags(tags, stock)
        if not pool:
            pool = stock.get("default", [])
        if isinstance(pool, list):
            pool = [p for p in pool if p]
        else:
            pool = []
        all_images = _pick_least_recently_used(pool, used, count=4, exclude_bases=recent_cover_bases)

    # Deduplicate
    seen = set()
    unique_images = []
    for img in all_images:
        base = img.split("?")[0]
        if base not in seen and base not in recent_cover_bases:
            seen.add(base)
            unique_images.append(img)

    # Ensure we have enough (exclude recent covers)
    if len(unique_images) < 2:
        default_pool = stock.get("default", [])
        if isinstance(default_pool, list):
            for url in default_pool:
                if not url:
                    continue
                base = url.split("?")[0]
                if base in recent_cover_bases or base in seen:
                    continue
                unique_images.append(url)
                seen.add(base)
                if len(unique_images) >= 4:
                    break

    # Update used_images
    if unique_images:
        new_used = [unique_images[0]] + used
        _save_used_images(new_used[:USED_IMAGES_MAX])

    # #region agent log
    try:
        _logpath = BOT_DIR.parent / ".cursor" / "debug.log"
        _logpath.parent.mkdir(parents=True, exist_ok=True)
        first_prod = (draft["frontmatter"].get("amazonProducts") or [])[0] if draft["frontmatter"].get("amazonProducts") else None
        cover_url = (unique_images[0][:60] + "...") if unique_images and len(unique_images[0]) > 60 else (unique_images[0] if unique_images else "")
        with open(_logpath, "a", encoding="utf-8") as _f:
            _f.write(json.dumps({"hypothesisId": "H2", "location": "image_fetcher.fetch_images", "message": "cover_selection", "data": {"primary_topic": primary_topic, "first_product_title": (first_prod.get("title", "")[:40] if first_prod else ""), "first_product_category": (first_prod.get("category", "") if first_prod else ""), "cover_url_preview": cover_url, "title": title[:40]}, "timestamp": __import__("time").time_ns() // 1_000_000}) + "\n")
    except Exception:
        pass
    # #endregion

    updated = dict(draft)
    updated["frontmatter"] = dict(draft["frontmatter"])

    if unique_images:
        updated["frontmatter"]["coverImage"] = unique_images[0]
        updated["frontmatter"]["images"] = unique_images[1:4]

    log.info("Fetched %d images for: %s", len(unique_images), title)
    return updated


def _clean_query_for_images(query: str, primary_topic: str = "general") -> str:
    """Clean a product query for better Unsplash results. Use primary_topic to bias when query is ambiguous."""
    clean = re.sub(r"\b(RTX|RX|GTX|AMD|Intel|DDR\d|NVMe)\s*\d[\w-]*", "", query, flags=re.IGNORECASE)
    mappings = {
        "shield": "streaming stick smart tv",
        "nvidia": "graphics card computer",
        "gpu": "graphics card gaming",
        "cpu": "processor chip technology",
        "playstation": "gaming console controller",
        "ps5": "gaming console",
        "xbox": "gaming console Microsoft",
        "steam deck": "handheld gaming portable",
        "motherboard": "computer motherboard circuit",
        "ram": "computer memory technology",
        "ssd": "solid state drive storage",
        "fsr": "graphics card gaming",
        "vulkan": "graphics card gaming",
        "radeon": "graphics card gaming",
        "driver": "graphics card computer",
    }
    for kw, replacement in mappings.items():
        if kw in clean.lower():
            return replacement
    # Bias by primary topic when query is generic
    if primary_topic == "gpu":
        return "graphics card gaming"
    if primary_topic == "cpu":
        return "processor chip technology"
    if primary_topic == "console":
        return "gaming console controller"
    if primary_topic == "storage":
        return "solid state drive storage"
    if primary_topic == "streaming":
        return "streaming stick smart tv"
    return (clean.strip() or "technology computer gaming")[:80]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", default="RTX 4090 graphics card", help="Image search query")
    args = parser.parse_args()
    images = search_unsplash(args.query, count=4)
    print(json.dumps(images, indent=2))
