# Bot logging

## Single pipeline log: `bot/logs/pipeline.log`

Every script appends to **`bot/logs/pipeline.log`** so you have one place to see what ran and why images (or content) changed.

**Format:** `[ISO timestamp] [SCRIPT] message`

**Scripts that write to it:**

- **scheduler** — run started, published slug, backfill starting, image_refresh starting/done
- **image_fetcher** — every cover decision: `cover slug=... title=... source=... cover=URL`
- **backfill** — run_backfill started/done, fix-list present or missing, each backfill_cover with slug/source/new_cover
- **generate_fix_list** — started, wrote fix-list.json, first 10 slugs with their image_search_queries
- **validate_existing** — started, wrote validation-report.json

**Image `source` values:**

- **unsplash_api** / **pexels_api** — image came from API search (using AI or title/amazon queries)
- **amazon_products** — cover came from an Amazon product image
- **stock_pool** — cover came from `stock_images.json` (tag-based fallback)
- **fix_list** (backfill only) — cover was refreshed using AI-generated queries from fix-list.json
- **fallback** (backfill only) — no fix list; used title-based search

**How to use:**

```powershell
# Tail the pipeline log (see new lines as scripts run)
Get-Content bot\logs\pipeline.log -Wait -Tail 50

# Search for why a slug’s image changed
Select-String -Path bot\logs\pipeline.log -Pattern "slug=my-post-slug"

# Search for all cover decisions
Select-String -Path bot\logs\pipeline.log -Pattern "cover slug="
```

Other logs (scheduler.log, backfill.log, etc.) are unchanged; use them for stack traces and debug. **pipeline.log** is the high-level audit trail.
