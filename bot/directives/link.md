---
directive: amazon_linking
description: How to find and embed Amazon affiliate product links in articles
---

# Amazon Linking Directive

## Goal
Find 2–4 real Amazon products relevant to each article and embed them with the correct affiliate tag.

## Tools
- `execution/amazon_linker.py`

## Strategy (in order of preference)
1. **PA-API 5.0 search** — exact product data (ASIN, image, price, title). Best for commission.
2. **Amazon search URL with tag** — no ASIN, but still earns commission on anything bought in the session.

## Product Matching Logic
- Use `amazon_search_queries` from the AI writer's metadata
- If the exact product isn't available → find a similar product at a comparable price point
  - e.g. RTX 5090 not on Amazon → link to RTX 4090 with a note
  - e.g. Writing about PS6 leaks → link to PS5 Pro or existing best value console
- Prefer UK Amazon (amazon.co.uk) — our audience is primarily UK-based

## Requirements
- Maximum 4 products per article
- Products should visually match what we're discussing
- Include affiliate tag in ALL links (`?tag=ctrlaltstock-21`)
- If product has no image (search URL fallback) → display a search icon placeholder

## Learnings
_Update with ASIN lookup patterns, API limits, or product availability quirks._
