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
from pathlib import Path
from typing import Dict, Any, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

import config

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
    """Persist recently used image URLs."""
    try:
        USED_IMAGES_PATH.write_text(
            json.dumps({"urls": urls[:USED_IMAGES_MAX]}, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        log.warning("Could not save used_images.json: %s", e)


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


def _pick_least_recently_used(pool: List[str], used: List[str], count: int) -> List[str]:
    """Pick images from pool, preferring those not in used. Exclude used; if exhausted, use least-recent."""
    # Normalize URLs: ensure ?w=1200 for consistency
    def norm(u: str) -> str:
        base = u.split("?")[0]
        return base + "?w=1200" if "?" not in u else u

    pool_full = [norm(p) for p in pool if p]
    used_bases = {u.split("?")[0] for u in used}
    unused = [p for p in pool_full if p.split("?")[0] not in used_bases]
    used_ordered = [u.split("?")[0] for u in used]

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
    Prefers Amazon product images (relevant, unique). Falls back to Unsplash or stock.
    Updates frontmatter with coverImage and images array.
    Returns the updated draft.
    """
    title = draft["frontmatter"].get("title", "")
    tags = draft["frontmatter"].get("tags", [])
    all_images: List[str] = []

    # 1. Prefer Amazon product images (run after amazon_linker in pipeline)
    products = draft["frontmatter"].get("amazonProducts") or []
    for p in products:
        img = p.get("imageUrl") or ""
        if img and img not in all_images:
            all_images.append(img)
        if len(all_images) >= 4:
            break

    # 2. Try Unsplash API if key available and we need more
    stock = _load_stock_images()
    used = _load_used_images()
    if len(all_images) < 2 and config.unsplash.access_key:
        queries = [title] + draft.get("amazon_search_queries", [])[:2]
        for query in queries:
            clean_query = _clean_query_for_images(query)
            images = search_unsplash(clean_query, count=2)
            all_images.extend(images)
            if len(all_images) >= 4:
                break

    # 3. Fall back to tag-hierarchy stock images (no API key or not enough from API)
    if len(all_images) < 2:
        pool = _get_pool_for_tags(tags, stock)
        if not pool:
            pool = stock.get("default", [])
        if isinstance(pool, list):
            pool = [p for p in pool if p]
        else:
            pool = []
        all_images = _pick_least_recently_used(pool, used, count=4)

    # Deduplicate
    seen = set()
    unique_images = []
    for img in all_images:
        base = img.split("?")[0]
        if base not in seen:
            seen.add(base)
            unique_images.append(img)

    # Ensure we have enough
    if len(unique_images) < 2:
        default_pool = stock.get("default", [])
        if isinstance(default_pool, list):
            for url in default_pool:
                if url and url.split("?")[0] not in seen:
                    unique_images.append(url)
                    seen.add(url.split("?")[0])
                    if len(unique_images) >= 4:
                        break

    # Update used_images
    if unique_images:
        new_used = [unique_images[0]] + used
        _save_used_images(new_used[:USED_IMAGES_MAX])

    updated = dict(draft)
    updated["frontmatter"] = dict(draft["frontmatter"])

    if unique_images:
        updated["frontmatter"]["coverImage"] = unique_images[0]
        updated["frontmatter"]["images"] = unique_images[1:4]

    log.info("Fetched %d images for: %s", len(unique_images), title)
    return updated


def _clean_query_for_images(query: str) -> str:
    """Clean a product query for better Unsplash results (remove model numbers)."""
    import re
    clean = re.sub(r"\b(RTX|RX|GTX|AMD|Intel|DDR\d|NVMe)\s*\d[\w-]*", "", query, flags=re.IGNORECASE)
    mappings = {
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
    }
    for kw, replacement in mappings.items():
        if kw in clean.lower():
            return replacement
    return (clean.strip() or "technology computer gaming")[:80]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", default="RTX 4090 graphics card", help="Image search query")
    args = parser.parse_args()
    images = search_unsplash(args.query, count=4)
    print(json.dumps(images, indent=2))
