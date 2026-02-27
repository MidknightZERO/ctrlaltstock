"""
fix_affiliate_images.py — Populate empty imageUrl in public/affiliate-products.json
by fetching product images from Amazon search results.

Usage:
    python bot/fix_affiliate_images.py
    python bot/fix_affiliate_images.py --dry-run
"""

import json
import sys
import time
import argparse
from pathlib import Path

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

from amazon_linker import fetch_amazon_image

AFFILIATE_PATH = Path(config.git.repo_path) / "public" / "affiliate-products.json"


def fix_affiliate_images(dry_run: bool = False) -> int:
    """Populate empty imageUrl for products in affiliate-products.json. Returns count fixed."""
    if not AFFILIATE_PATH.exists():
        print(f"Not found: {AFFILIATE_PATH}")
        return 0

    with open(AFFILIATE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    products = data.get("products") or []
    fixed = 0
    for i, p in enumerate(products):
        if p.get("imageUrl"):
            continue
        query = p.get("name") or p.get("id", "")
        if not query:
            continue
        img = fetch_amazon_image(query)
        if img:
            products[i] = {**p, "imageUrl": img}
            fixed += 1
            print(f"  Fetched image for: {query[:50]}")
        if i < len(products) - 1:
            time.sleep(1)  # Rate limit

    if fixed and not dry_run:
        with open(AFFILIATE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Updated {AFFILIATE_PATH} with {fixed} images")
    elif fixed and dry_run:
        print(f"[dry-run] Would fix {fixed} images")

    return fixed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    n = fix_affiliate_images(dry_run=args.dry_run)
    sys.exit(0 if n >= 0 else 1)


if __name__ == "__main__":
    main()
