---
directive: scrape_news
description: How to scrape Reddit and RSS feeds for relevant tech hardware stories
---

# Scraping Directive

## Goal
Find 1 high-quality, relevant tech hardware story per hour that hasn't been covered yet.

## Tools
- `execution/scraper.py` — main scraper
- `bot/seen_posts.db` — SQLite deduplication store

## Inputs
- Reddit credentials (PRAW OAuth)
- List of subreddits and RSS feeds (in `config.py`)

## Process
1. Poll Reddit `/new` for each configured subreddit, past 2 hours, >20 upvotes
2. Poll all RSS feeds for entries in the past 2 hours
3. Filter by relevance score (keyword match against hardware keyword list)
4. Filter out already-seen post IDs from SQLite
5. Sort by relevance score descending
6. For the top story, attempt to fetch the full article text from its source URL
7. Mark story as seen, return StoryBrief

## Edge Cases
- **Reddit API auth failure**: PRAW will throw `prawcore.exceptions.OAuthException`. Check credentials in `.env`.
- **RSS feed timeout**: `feedparser` has no built-in timeout. We wrap with `tenacity` retry (3 attempts).
- **No stories found**: Return None. Scheduler skips this run (doesn't fail).
- **Reddit rate limiting**: PRAW handles rate limiting automatically. If you hit it, increase the run interval.

## Output
A `StoryBrief` dict:
```json
{
  "id": "reddit:abc123",
  "title": "NVIDIA RTX 5090 Review: Worth £2000?",
  "summary": "...",
  "source_url": "https://reddit.com/...",
  "source_type": "reddit",
  "raw_content": "...",
  "relevance_score": 7,
  "published_at": "2026-02-26T10:00:00+00:00"
}
```

## Learnings
_Update this section as you discover API quirks or timing constraints._
