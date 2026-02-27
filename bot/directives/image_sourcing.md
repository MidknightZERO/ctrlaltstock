---
directive: image_sourcing
description: How the bot selects and assigns images for blog articles
---

# Image Sourcing Directive

## Goal
Assign relevant cover and body images to blog articles while minimizing reuse across recent posts.

## Sources (priority order)
1. **Amazon product images** — From amazonProducts in draft (topic-matched, excludes recently used)
2. **Unsplash API** — If API key configured, search by article title/topic
3. **Curated stock catalogue** — `bot/stock_images.json` by category (gpu, cpu, console, Deals, etc.)

## Anti-reuse
- **used_images.json** — Tracks last 50 used image URLs (most recent first)
- **blog-posts.json** — Cover images from posts in last N days (config: `image_reuse_lookback_days`, default 7) are excluded
- **Prefer least-recently-used** — When picking from stock pool, `_pick_least_recently_used()` prefers images not in used list; if all used, picks from least-recent end

## Configuration
- `bot/stock_images.json` — Curated Unsplash URLs by category (Hardware, Display, Console, Deals, Software, default)
- `bot/used_images.json` — Persisted after each image assignment
- `config.bot.image_reuse_lookback_days` — Days to exclude recent cover images (default 7)

## Process
1. image_fetcher.fetch_images(draft) runs during publish pipeline
2. Primary topic inferred from title/tags (gpu, cpu, console, game, deals, etc.)
3. Pool selected from stock_images by topic; fallback to tags, then default
4. _pick_least_recently_used(pool, used, exclude_bases) returns best candidates
5. Selected image(s) written to frontmatter.coverImage and frontmatter.images
6. used_images.json updated with new cover URL
