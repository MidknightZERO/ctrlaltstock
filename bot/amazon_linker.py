"""
amazon_linker.py — Finds relevant Amazon products and embeds affiliate links.

Strategy:
  1. Load curated product list (public/affiliate-products.json) and match by tags/keywords.
  2. If fewer than 2 matches, supplement with PA-API or search-URL fallback.
  3. PA-API 5.0 (optional) or search URL with affiliate tag for any extra products.

Returns a list of AmazonProduct dicts to embed in article frontmatter.

Usage:
    python amazon_linker.py --query "RTX 4090 graphics card"
    python amazon_linker.py --test
"""

import json
import sys
import logging
import argparse
import re
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.parse import quote_plus

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

import config

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [amazon_linker] %(levelname)s %(message)s")

# Curated list path (single source of truth for product links)
AFFILIATE_PRODUCTS_PATH = Path(config.git.repo_path) / "public" / "affiliate-products.json"
MIN_CURATED_PRODUCTS = 3
MAX_CURATED_PRODUCTS = 3


# ── Amazon URL builder (no-API fallback) ─────────────────────────────────────

def build_amazon_search_url(query: str, partner_tag: str, region: str = "uk") -> str:
    """Build a direct Amazon search URL with affiliate tag. Always earns commission."""
    base = "https://www.amazon.co.uk" if region == "uk" else "https://www.amazon.com"
    encoded = quote_plus(query)
    return f"{base}/s?k={encoded}&tag={partner_tag}"


def build_amazon_product_url(asin: str, partner_tag: str, region: str = "uk") -> str:
    """Build a direct product URL from an ASIN."""
    base = "https://www.amazon.co.uk" if region == "uk" else "https://www.amazon.com"
    return f"{base}/dp/{asin}?tag={partner_tag}"


# ── Amazon image fetch (fallback when PA-API not configured) ─────────────────

AMAZON_IMAGE_PATTERN = re.compile(
    r'https://[^"\']*media-amazon\.com/images/I/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_=-]+)*\.(?:jpg|png|webp)',
    re.IGNORECASE,
)


def fetch_amazon_image(query: str) -> str:
    """
    Fetch the first product image from Amazon search results.
    Returns image URL or empty string if not found. Used when PA-API is not configured.
    """
    url = build_amazon_search_url(query, config.amazon.partner_tag, config.amazon.region)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
    }
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                log.debug("Amazon fetch returned %d for %s", resp.status_code, query[:40])
                return ""
            html = resp.text
        matches = AMAZON_IMAGE_PATTERN.findall(html)
        for m in matches:
            if "sprites" not in m.lower() and "pixel" not in m.lower():
                return m
        return ""
    except Exception as e:
        log.debug("Could not fetch Amazon image for %s: %s", query[:40], e)
        return ""


def ensure_product_image(product: Dict[str, Any]) -> Dict[str, Any]:
    """If product has no imageUrl, try to fetch from Amazon search. Returns updated product."""
    if product.get("imageUrl"):
        return product
    query = product.get("query") or product.get("title") or product.get("name", "")
    if not query:
        return product
    img = fetch_amazon_image(query)
    if img:
        product = dict(product)
        product["imageUrl"] = img
        log.info("Fetched image for: %s", query[:50])
    return product


# ── PA-API 5.0 (official) ────────────────────────────────────────────────────

def try_paapi_search(query: str) -> List[Dict[str, Any]]:
    """
    Search Amazon PA-API 5.0 for products matching a query.
    Returns list of product dicts (may be empty if API not configured).
    """
    if not config.amazon.access_key or not config.amazon.secret_key:
        log.info("Amazon PA-API not configured — using search URL fallback")
        return []

    try:
        # Use paapi5-python-sdk if installed
        from paapi5_python_sdk.api.default_api import DefaultApi
        from paapi5_python_sdk.models.search_items_request import SearchItemsRequest
        from paapi5_python_sdk.models.partner_type import PartnerType
        from paapi5_python_sdk.models.search_index import SearchIndex
        from paapi5_python_sdk.models.resources_enum import ResourcesEnum
        from paapi5_python_sdk.rest import ApiException
        import paapi5_python_sdk

        api = DefaultApi(
            access_key=config.amazon.access_key,
            secret_key=config.amazon.secret_key,
            host=config.amazon.marketplace,
            region="eu-west-1" if config.amazon.region == "uk" else "us-east-1",
        )

        resources = [
            ResourcesEnum.ITEMINFO_TITLE,
            ResourcesEnum.OFFERS_LISTINGS_PRICE,
            ResourcesEnum.IMAGES_PRIMARY_LARGE,
        ]

        request = SearchItemsRequest(
            partner_tag=config.amazon.partner_tag,
            partner_type=PartnerType.ASSOCIATES,
            keywords=query,
            search_index=SearchIndex.ELECTRONICS,
            item_count=3,
            resources=resources,
        )

        response = api.search_items(request)
        products = []
        for item in response.search_result.items or []:
            asin = item.asin
            title = item.item_info.title.display_value if item.item_info and item.item_info.title else query
            image = ""
            if item.images and item.images.primary and item.images.primary.large:
                image = item.images.primary.large.url
            price = ""
            if item.offers and item.offers.listings:
                listing = item.offers.listings[0]
                if listing.price:
                    price = listing.price.display_amount or ""

            products.append({
                "asin": asin,
                "title": title,
                "imageUrl": image,
                "price": price,
                "affiliateUrl": build_amazon_product_url(asin, config.amazon.partner_tag, config.amazon.region),
                "searchUrl": build_amazon_search_url(query, config.amazon.partner_tag, config.amazon.region),
                "category": "Electronics",
                "query": query,
            })
        return products

    except ImportError:
        log.warning("paapi5-python-sdk not installed — using search URL fallback")
        return []
    except Exception as e:
        log.error("PA-API error for query '%s': %s", query, e)
        return []


# ── Curated product list ─────────────────────────────────────────────────────

def load_curated_products() -> List[Dict[str, Any]]:
    """Load the curated affiliate product list from public/affiliate-products.json."""
    if not AFFILIATE_PRODUCTS_PATH.exists():
        log.warning("Curated list not found at %s — using fallback only", AFFILIATE_PRODUCTS_PATH)
        return []
    try:
        data = json.loads(AFFILIATE_PRODUCTS_PATH.read_text(encoding="utf-8"))
        return data.get("products", [])
    except Exception as e:
        log.error("Could not load curated products: %s", e)
        return []


def _keywords_from_draft(draft: Dict[str, Any]) -> List[str]:
    """Build a list of normalised keywords from draft tags, title, and AI-suggested queries."""
    keywords = []
    frontmatter = draft.get("frontmatter", {})
    for tag in frontmatter.get("tags", []):
        keywords.extend(re.split(r"[\s\-/]+", str(tag).lower()))
    title = frontmatter.get("title", "") or draft.get("title", "")
    keywords.extend(re.split(r"[\s\-/]+", title.lower()))
    for q in draft.get("amazon_search_queries", []) or []:
        keywords.extend(re.split(r"[\s\-/]+", str(q).lower()))
    for kw in draft.get("featured_product_keywords", []) or []:
        keywords.extend(re.split(r"[\s\-/]+", str(kw).lower()))
    return [k for k in keywords if len(k) > 1]


def _score_product(product: Dict[str, Any], keywords: List[str]) -> int:
    """Score how well a curated product matches the draft keywords."""
    score = 0
    product_tags = [str(t).lower() for t in product.get("tags", [])]
    name_parts = re.split(r"[\s\-/]+", (product.get("name") or "").lower())
    category = (product.get("category") or "").lower()
    searchable = set(product_tags + name_parts + ([category] if category else []))
    for kw in keywords:
        if kw in searchable:
            score += 2
        elif any(kw in s for s in searchable):
            score += 1
    return score


def curated_product_to_amazon(product: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a curated product entry to the AmazonProduct shape used in frontmatter."""
    url = product.get("url", "")
    return {
        "asin": "",
        "title": product.get("name", ""),
        "imageUrl": product.get("imageUrl", ""),
        "price": product.get("price", ""),
        "affiliateUrl": url,
        "searchUrl": url,
        "category": product.get("category", "Electronics"),
        "query": product.get("name", ""),
    }


def select_curated_for_draft(draft: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Select up to MAX_CURATED_PRODUCTS from the curated list that best match the draft.
    Returns list in AmazonProduct shape.
    """
    products = load_curated_products()
    if not products:
        return []
    keywords = _keywords_from_draft(draft)
    if not keywords:
        # Still return a few general picks (e.g. first 3) so we show something
        return [curated_product_to_amazon(p) for p in products[:MAX_CURATED_PRODUCTS]]
    scored = [(p, _score_product(p, keywords)) for p in products]
    scored.sort(key=lambda x: x[1], reverse=True)
    # Take products with score > 0, up to MAX_CURATED_PRODUCTS
    selected = [p for p, s in scored if s > 0][:MAX_CURATED_PRODUCTS]
    if not selected:
        selected = [p for p, _ in scored[:MAX_CURATED_PRODUCTS]]
    return [curated_product_to_amazon(p) for p in selected]


# ── Search URL fallback (always works) ──────────────────────────────────────

def make_fallback_product(query: str) -> Dict[str, Any]:
    """
    Create a product dict with a search URL (no ASIN needed).
    This earns commission when users click and buy anything in the same session.
    """
    return {
        "asin": "",
        "title": query,
        "imageUrl": "",
        "price": "",
        "affiliateUrl": build_amazon_search_url(query, config.amazon.partner_tag, config.amazon.region),
        "searchUrl": build_amazon_search_url(query, config.amazon.partner_tag, config.amazon.region),
        "category": "Electronics",
        "query": query,
    }


# ── Smart product matching ───────────────────────────────────────────────────

def find_products_for_article(draft: Dict[str, Any]) -> Dict[str, Any]:
    """
    Find Amazon products relevant to an article and embed them.
    Prefer curated list (public/affiliate-products.json); supplement with PA-API/search if needed.
    Updates frontmatter.amazonProducts and featuredProductId.
    Returns updated draft.
    """
    unique_products: List[Dict[str, Any]] = []

    # 1. Prefer curated product list (large list of links, matched by tags/keywords)
    curated = select_curated_for_draft(draft)
    if curated:
        log.info("Selected %d products from curated list", len(curated))
        unique_products = curated[:MAX_CURATED_PRODUCTS]

    # 2. If we have fewer than MIN_CURATED_PRODUCTS, add fallback from queries
    queries = draft.get("amazon_search_queries", [])
    tags = draft["frontmatter"].get("tags", [])
    if not queries:
        hardware_tags = [t for t in tags if any(kw in t.lower() for kw in [
            "rtx", "rx", "gtx", "gpu", "nvidia", "amd", "intel", "ps5", "xbox",
            "steam deck", "cpu", "ryzen", "core i", "ssd", "ram"
        ])]
        queries = hardware_tags[:3] or [draft["frontmatter"].get("title", "tech hardware")]

    seen_titles = {p.get("title", p.get("query", "")) for p in unique_products}
    while len(unique_products) < MIN_CURATED_PRODUCTS and queries:
        query = queries.pop(0)
        if query in seen_titles:
            continue
        log.info("Supplementing with Amazon search: %s", query)
        products = try_paapi_search(query)
        if products:
            for p in products[:2]:
                if p.get("title") not in seen_titles:
                    seen_titles.add(p.get("title", ""))
                    unique_products.append(p)
                    if len(unique_products) >= 4:
                        break
        else:
            unique_products.append(make_fallback_product(query))
            seen_titles.add(query)
        if len(unique_products) >= 4:
            break

    # Deduplicate by title/query
    seen = set()
    deduped = []
    for p in unique_products:
        key = p.get("asin") or p.get("query") or p.get("title", "")
        if key not in seen:
            seen.add(key)
            deduped.append(p)
    unique_products = deduped[:3]  # cap at 3 products

    # Fetch images for products that don't have them
    for i, p in enumerate(unique_products):
        if not p.get("imageUrl"):
            unique_products[i] = ensure_product_image(p)
            if i < len(unique_products) - 1:
                time.sleep(1)  # Rate limit to avoid blocks

    updated = dict(draft)
    updated["frontmatter"] = dict(draft["frontmatter"])
    updated["frontmatter"]["amazonProducts"] = unique_products
    if unique_products:
        updated["frontmatter"]["featuredProductId"] = unique_products[0].get("asin", "")

    log.info("Found %d Amazon products for article", len(unique_products))
    return updated


# ── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", help="Search query to test")
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()

    if args.test:
        queries = ["NVIDIA RTX 4090 graphics card", "AMD Radeon RX 7900 XTX"]
        for q in queries:
            products = try_paapi_search(q) or [make_fallback_product(q)]
            print(f"\nQuery: {q}")
            print(json.dumps(products, indent=2))
    elif args.query:
        products = try_paapi_search(args.query) or [make_fallback_product(args.query)]
        print(json.dumps(products, indent=2))
    else:
        draft = json.loads(sys.stdin.read())
        result = find_products_for_article(draft)
        print(json.dumps(result, indent=2, ensure_ascii=False))
