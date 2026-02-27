"""
scraper.py — Scrapes Reddit posts and RSS feeds for relevant tech hardware news.

Outputs a StoryBrief dict with title, summary, source_url, source_type, raw_content.
Uses SQLite to deduplicate stories across runs.

Usage:
    python scraper.py              # Returns best story as JSON to stdout
    python scraper.py --dry-run    # Same but doesn't mark stories as seen
"""

import sqlite3
import json
import argparse
import sys
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pathlib import Path

import praw
import feedparser
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

import config

# ── Logging ──────────────────────────────────────────────────────────────────
Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(config.bot.logs_dir) / "scraper.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ── Database helpers ──────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    db = sqlite3.connect(config.bot.db_path)
    db.execute("""
        CREATE TABLE IF NOT EXISTS seen_posts (
            id TEXT PRIMARY KEY,
            source TEXT,
            title TEXT,
            seen_at TEXT
        )
    """)
    db.commit()
    return db


def normalize_string(s: str) -> str:
    """Normalize string for robust comparison by removing non-alphanumeric chars and extra whitespace."""
    if not s:
        return ""
    # Remove everything except characters and numbers
    s = re.sub(r'[^a-z0-9]', '', s.lower())
    return s


def is_seen(db: sqlite3.Connection, post_id: str, title: str = "") -> bool:
    # Check by ID
    row = db.execute("SELECT 1 FROM seen_posts WHERE id = ?", (post_id,)).fetchone()
    if row:
        return True
    
    # Check by normalized title
    if title:
        norm_title = normalize_string(title)
        # Fetch all titles from DB and compare normalized (for small DB)
        # In a real app we'd store norm_title in DB.
        rows = db.execute("SELECT title FROM seen_posts").fetchall()
        for (old_title,) in rows:
            if normalize_string(old_title) == norm_title:
                return True
            
    return False


def mark_seen(db: sqlite3.Connection, post_id: str, source: str, title: str):
    db.execute(
        "INSERT OR IGNORE INTO seen_posts (id, source, title, seen_at) VALUES (?, ?, ?, ?)",
        (post_id, source, title, datetime.now(timezone.utc).isoformat()),
    )
    db.commit()


# ── Existing blog posts (no-repeat) ────────────────────────────────────────────

SIMILARITY_THRESHOLD = 0.6  # Filter out candidates above this (same topic as existing article)
RECENT_N_FOR_DIVERSITY = 10  # Number of recent posts to consider for topic balance
SIMILARITY_LOOKBACK_DAYS = 7  # Only run similarity check against posts from the last N days (new week = new news)


def load_existing_posts() -> List[Dict[str, Any]]:
    """Load published blog posts from blog-posts.json for dedup and diversity."""
    json_path = Path(config.git.repo_path) / config.bot.blog_json_path
    if not json_path.exists():
        log.debug("blog-posts.json not found at %s — skipping no-repeat/diversity", json_path)
        return []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        posts = data if isinstance(data, list) else []
        return [
            {
                "title": p.get("title", ""),
                "slug": p.get("slug", ""),
                "tags": [str(t) for t in p.get("tags", [])],
                "publishedDate": p.get("publishedDate", ""),
            }
            for p in posts
        ]
    except Exception as e:
        log.warning("Could not load blog-posts.json: %s", e)
        return []


def posts_from_last_n_days(posts: List[Dict[str, Any]], days: int) -> List[Dict[str, Any]]:
    """Return only posts with publishedDate within the last N days (for similarity/diversity)."""
    if days <= 0:
        return posts
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = []
    for p in posts:
        raw = p.get("publishedDate", "")
        if not raw:
            continue
        try:
            # Support ISO date (YYYY-MM-DD) or full ISO datetime
            if "T" in raw:
                pub = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
            else:
                pub = datetime.strptime(raw[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if pub >= cutoff:
                result.append(p)
        except (ValueError, TypeError):
            continue
    return result


def _parse_published_date(post: Dict[str, Any]) -> Optional[datetime]:
    """Parse publishedDate from a post; return None if missing or invalid."""
    raw = post.get("publishedDate", "")
    if not raw:
        return None
    try:
        if "T" in raw:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
        return datetime.strptime(raw[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _most_recent_post(posts: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Return the single most recently published post (for alternation)."""
    if not posts:
        return None
    with_dates = [(p, _parse_published_date(p)) for p in posts]
    with_dates = [(p, d) for p, d in with_dates if d is not None]
    if not with_dates:
        return posts[0]
    with_dates.sort(key=lambda x: x[1], reverse=True)
    return with_dates[0][0]


def _title_words(text: str) -> set:
    """Normalize to set of significant words (lowercase, alphanumeric tokens)."""
    if not text:
        return set()
    normalized = re.sub(r"[^a-z0-9\s]", " ", text.lower()).strip()
    words = set(w for w in normalized.split() if len(w) > 1)
    return words


def similarity_to_existing(story: Dict[str, Any], existing_posts: List[Dict[str, Any]]) -> float:
    """
    Return similarity in [0, 1] to any existing post. High = same topic (e.g. same driver update).
    Uses word overlap between story title and existing titles/tags (title-only for story so duplicate headlines are detected).
    """
    if not existing_posts:
        return 0.0
    story_words = _title_words(story.get("title", ""))
    if not story_words:
        return 0.0
    best = 0.0
    for post in existing_posts:
        existing_text = post.get("title", "") + " " + " ".join(post.get("tags", []))
        existing_words = _title_words(existing_text)
        if not existing_words:
            continue
        overlap = len(story_words & existing_words) / len(story_words)
        if overlap > best:
            best = overlap
    return min(1.0, best)


def classify_topic(story: Dict[str, Any]) -> str:
    """Classify story into driver_update, personal_build, deal, review, or news."""
    text = (story.get("title", "") + " " + story.get("summary", "") + " " + story.get("raw_content", "")).lower()
    if any(kw in text for kw in config.bot.driver_update_keywords):
        return "driver_update"
    if any(kw in text for kw in config.bot.personal_story_keywords):
        return "personal_build"
    if any(kw in text for kw in config.bot.deal_keywords):
        return "deal"
    if any(kw in text for kw in config.bot.review_keywords):
        return "review"
    return "news"


def infer_topic_for_post(post: Dict[str, Any]) -> str:
    """Infer topic from an existing blog post (title + tags)."""
    tags = post.get("tags", [])
    tags_str = " ".join(str(t) for t in tags) if tags else ""
    text = (post.get("title", "") + " " + tags_str).lower()
    if any(kw in text for kw in config.bot.driver_update_keywords):
        return "driver_update"
    if any(kw in text for kw in config.bot.personal_story_keywords):
        return "personal_build"
    if any(kw in text for kw in config.bot.deal_keywords):
        return "deal"
    if any(kw in text for kw in config.bot.review_keywords):
        return "review"
    return "news"


def classify_theme(story: Dict[str, Any]) -> str:
    """
    Classify story into content theme for diversity: console, tv, listicle, or pc_hardware.
    Used to balance PC-heavy feed with consoles, TVs, and mass-appeal listicles.
    """
    text = (story.get("title", "") + " " + story.get("summary", "")).lower()
    if getattr(config.bot, "theme_console_keywords", None):
        if any(kw in text for kw in config.bot.theme_console_keywords):
            return "console"
    if getattr(config.bot, "theme_tv_keywords", None):
        if any(kw in text for kw in config.bot.theme_tv_keywords):
            return "tv"
    if getattr(config.bot, "theme_listicle_keywords", None):
        if any(kw in text for kw in config.bot.theme_listicle_keywords):
            return "listicle"
    return "pc_hardware"


def infer_theme_for_post(post: Dict[str, Any]) -> str:
    """Infer content theme from an existing blog post (title + tags)."""
    tags = post.get("tags", [])
    tags_str = " ".join(str(t) for t in tags) if tags else ""
    text = (post.get("title", "") + " " + tags_str).lower()
    if getattr(config.bot, "theme_console_keywords", None):
        if any(kw in text for kw in config.bot.theme_console_keywords):
            return "console"
    if getattr(config.bot, "theme_tv_keywords", None):
        if any(kw in text for kw in config.bot.theme_tv_keywords):
            return "tv"
    if getattr(config.bot, "theme_listicle_keywords", None):
        if any(kw in text for kw in config.bot.theme_listicle_keywords):
            return "listicle"
    return "pc_hardware"


def theme_diversity_bonus(theme: str, recent_themes: List[str]) -> float:
    """Higher when this theme is under-represented in recent posts (favors console/TV/listicle after PC-heavy runs)."""
    if not recent_themes:
        return 1.0
    count = sum(1 for t in recent_themes if t == theme)
    return 1.0 / (1.0 + count)


def diversity_bonus(topic: str, recent_topics: List[str]) -> float:
    """Higher when this topic is under-represented in recent posts. 1.0 = not in recent; lower if over-represented."""
    if not recent_topics:
        return 1.0
    count = sum(1 for t in recent_topics if t == topic)
    # Inverse of (1 + count) so 0 recent -> 1.0, 1 -> 0.5, 2 -> 0.33, etc.
    return 1.0 / (1.0 + count)


def _log_rejected_candidates(selected: Dict[str, Any], rejected: List[Dict[str, Any]], dry_run: bool) -> None:
    """Append this run's selected + rejected candidates to a JSONL log for weighting review."""
    if dry_run or not rejected:
        return
    log_path = Path(config.bot.logs_dir) / "rejected_candidates.jsonl"
    try:
        entry = {
            "run_at": datetime.now(timezone.utc).isoformat(),
            "selected": {
                "title": selected.get("title", "")[:120],
                "id": selected.get("id", ""),
                "topic": selected.get("topic", ""),
                "theme": selected.get("theme", "pc_hardware"),
                "story_angle": "personal" if (selected.get("personal_score") or 0) >= 0.5 else "news",
                "relevance_score": selected.get("relevance_score", 0),
                "source_type": selected.get("source_type", ""),
            },
            "rejected": [
                {
                    "rank": i + 2,
                    "title": s.get("title", ""),
                    "id": s.get("id", ""),
                    "source_type": s.get("source_type", ""),
                    "topic": s.get("topic", ""),
                    "story_angle": "personal" if (s.get("personal_score") or 0) >= 0.5 else "news",
                    "relevance_score": s.get("relevance_score", 0),
                    "theme": s.get("theme", "pc_hardware"),
                    "summary": (s.get("summary") or "")[:800],
                    "source_url": s.get("source_url", ""),
                    "raw_content": (s.get("raw_content") or s.get("summary") or s.get("title", ""))[:2000],
                    "subreddit": s.get("subreddit", "hardware"),
                    "source_name": s.get("source_name", "Tech News"),
                }
                for i, s in enumerate(rejected[:20])  # cap at 20 to keep lines readable
            ],
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        log.info("Logged %d rejected candidates to %s", len(rejected), log_path.name)
    except Exception as e:
        log.warning("Could not write rejected candidates log: %s", e)


def personal_score(story: Dict[str, Any]) -> float:
    """1.0 if story looks personal/emotional; 0.0 otherwise. buildapc subreddit gets a boost."""
    text = (story.get("title", "") + " " + story.get("summary", "")).lower()
    if any(kw in text for kw in config.bot.personal_story_keywords):
        return 1.0
    if story.get("source_type") == "reddit" and story.get("subreddit", "").lower() == "buildapc":
        return 0.5  # buildapc often has first-build stories
    return 0.0


# ── Relevance scoring ─────────────────────────────────────────────────────────

def relevance_score(text: str) -> int:
    """Score a piece of text by how many hardware keywords it contains."""
    text_lower = text.lower()
    return sum(1 for kw in config.bot.relevance_keywords if kw in text_lower)


# ── Reddit scraper ────────────────────────────────────────────────────────────

def get_reddit_client() -> Optional[praw.Reddit]:
    if not config.reddit.client_id or not config.reddit.client_secret:
        log.warning("Reddit credentials not configured — skipping Reddit scrape")
        return None
    return praw.Reddit(
        client_id=config.reddit.client_id,
        client_secret=config.reddit.client_secret,
        user_agent=config.reddit.user_agent,
    )


def scrape_reddit_keyless(subreddit: str) -> List[Dict[str, Any]]:
    """Scrape Reddit using public .json endpoint (no API keys required)."""
    log.info("Scraping r/%s via public JSON feed...", subreddit)
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit=25"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    
    stories = []
    try:
        with httpx.Client(timeout=10, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                log.warning("Reddit public feed returned %d for r/%s", resp.status_code, subreddit)
                return []
            
            data = resp.json()
            posts = data.get("data", {}).get("children", [])
            for post in posts:
                p = post["data"]
                # Filter self posts (we want news links) and NSFW
                if p.get("is_self") or p.get("over_18"):
                    continue
                # Min upvotes check
                if p.get("ups", 0) < config.reddit.min_upvotes:
                    continue
                
                created = datetime.fromtimestamp(p["created_utc"], tz=timezone.utc)
                combined = f"{p['title']} {p.get('selftext', '')}"
                score = relevance_score(combined)
                if score == 0:
                    continue
                
                stories.append({
                    "id": f"reddit:{p['id']}",
                    "title": p["title"],
                    "summary": (p.get("selftext", "") or "")[:500],
                    "source_url": p["url"],
                    "source_type": "reddit",
                    "subreddit": subreddit,
                    "upvotes": p.get("ups", 0),
                    "raw_content": p.get("selftext", "") or p["title"],
                    "relevance_score": score,
                    "published_at": created.isoformat(),
                })
    except Exception as e:
        log.error("Error scraping r/%s keyless: %s", subreddit, e)
    
    return stories


def scrape_reddit(db: sqlite3.Connection, dry_run: bool = False) -> List[Dict[str, Any]]:
    stories = []
    reddit = get_reddit_client()
    
    if reddit:
        log.info("Scraping Reddit via PRAW...")
        cutoff = datetime.now(timezone.utc) - timedelta(hours=config.rss.lookback_hours)
        try:
            for subreddit_name in config.reddit.subreddits:
                subreddit = reddit.subreddit(subreddit_name)
                for post in subreddit.new(limit=25):
                    created = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
                    if created < cutoff:
                        continue
                    if post.score < config.reddit.min_upvotes:
                        continue
                    if is_seen(db, f"reddit:{post.id}", post.title):
                        continue

                    combined = f"{post.title} {post.selftext or ''}"
                    score = relevance_score(combined)
                    if score == 0:
                        continue

                    stories.append({
                        "id": f"reddit:{post.id}",
                        "title": post.title,
                        "summary": (post.selftext or "")[:500],
                        "source_url": f"https://reddit.com{post.permalink}",
                        "source_type": "reddit",
                        "subreddit": subreddit_name,
                        "upvotes": post.score,
                        "raw_content": post.selftext or post.title,
                        "relevance_score": score,
                        "published_at": created.isoformat(),
                    })
                log.info("Reddit r/%s: found %d candidate stories", subreddit_name, len(stories))
        except Exception as e:
            log.error("Reddit PRAW scrape failed: %s", e)
            reddit = None # Force fallback
            
    if not reddit:
        log.info("Using keyless Reddit fallback...")
        for sub_name in config.reddit.subreddits:
            stories.extend(scrape_reddit_keyless(sub_name))

    return stories


# ── RSS scraper ───────────────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
def fetch_feed(url: str) -> Any:
    return feedparser.parse(url)


def scrape_rss(db: sqlite3.Connection, dry_run: bool = False) -> List[Dict[str, Any]]:
    stories = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=config.rss.lookback_hours)

    for feed_cfg in config.rss.feeds:
        try:
            feed = fetch_feed(feed_cfg["url"])
            for entry in feed.entries:
                # Parse publish date
                published = None
                for attr in ("published_parsed", "updated_parsed"):
                    if hasattr(entry, attr) and getattr(entry, attr):
                        import time as _time
                        published = datetime.fromtimestamp(
                            _time.mktime(getattr(entry, attr)), tz=timezone.utc
                        )
                        break
                if published is not None and published < cutoff:
                    continue

                post_id = f"rss:{entry.get('id', entry.get('link', entry.title))}"
                if is_seen(db, post_id, entry.title):
                    continue

                summary = BeautifulSoup(
                    entry.get("summary", ""), "lxml"
                ).get_text(separator=" ").strip()[:800]

                combined = f"{entry.title} {summary}"
                score = relevance_score(combined)
                if score == 0:
                    continue

                stories.append({
                    "id": post_id,
                    "title": entry.title,
                    "summary": summary,
                    "source_url": entry.get("link", ""),
                    "source_type": "rss",
                    "source_name": feed_cfg["name"],
                    "raw_content": summary,
                    "relevance_score": score,
                    "published_at": published.isoformat() if published else datetime.now(timezone.utc).isoformat(),
                })
            log.info("RSS %s: added %d candidates", feed_cfg["name"], len(stories))
        except Exception as e:
            log.error("RSS feed %s error: %s", feed_cfg["name"], e)

    return stories


# ── Full article fetch ────────────────────────────────────────────────────────

def fetch_article_text(url: str) -> str:
    """Attempt to fetch and extract the full article text from a URL."""
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; CtrlAltStockBot/1.0)"
        })
        soup = BeautifulSoup(resp.text, "lxml")
        # Remove nav, footer, ads
        for tag in soup(["script", "style", "nav", "footer", "aside", "header"]):
            tag.decompose()
        # Find main content
        for selector in ["article", "main", ".article-body", ".post-content", "#content"]:
            main = soup.select_one(selector)
            if main:
                return main.get_text(separator=" ").strip()[:3000]
        return soup.get_text(separator=" ").strip()[:3000]
    except Exception as e:
        log.warning("Could not fetch full article from %s: %s", url, e)
        return ""


# ── Main ──────────────────────────────────────────────────────────────────────

def get_best_story(dry_run: bool = False) -> Optional[Dict[str, Any]]:
    """
    Scrape all sources, filter duplicates of existing articles, balance topics and prefer
    personal stories, return the best story. If dry_run=True, do NOT mark as seen.
    """
    db = get_db()

    all_stories: List[Dict[str, Any]] = []
    all_stories.extend(scrape_reddit(db, dry_run))
    all_stories.extend(scrape_rss(db, dry_run))

    if not all_stories:
        log.warning("No relevant stories found in this run")
        db.close()
        return None

    existing_posts = load_existing_posts()
    # Only consider posts from the last 7 days for similarity (same topic next week is new news)
    recent_posts = posts_from_last_n_days(existing_posts, SIMILARITY_LOOKBACK_DAYS)
    recent_topics = [infer_topic_for_post(p) for p in recent_posts[:RECENT_N_FOR_DIVERSITY]]
    recent_themes = [infer_theme_for_post(p) for p in recent_posts[:RECENT_N_FOR_DIVERSITY]]

    # Alternate news vs personal: if last post was hardware/news, prefer personal next (and vice versa)
    last_post = _most_recent_post(existing_posts)
    last_was_personal = infer_topic_for_post(last_post) == "personal_build" if last_post else False
    prefer_personal_next = not last_was_personal
    log.info(
        "Alternation: last_was_personal=%s → prefer_personal_next=%s",
        last_was_personal,
        prefer_personal_next,
    )

    # Filter out stories too similar to already-published content (recent posts only)
    candidates = []
    for s in all_stories:
        sim = similarity_to_existing(s, recent_posts)
        s["similarity_to_existing"] = sim
        if sim >= SIMILARITY_THRESHOLD:
            log.info("Skipping story (already covered): %s", s.get("title", "")[:60])
            continue
        candidates.append(s)

    if not candidates:
        log.warning("All candidates were too similar to existing articles — no story selected")
        db.close()
        return None

    # Topic, theme, personal score, diversity bonuses, and alternation for ranking
    for s in candidates:
        s["topic"] = classify_topic(s)
        s["theme"] = classify_theme(s)
        s["personal_score"] = personal_score(s)
        s["diversity_bonus"] = diversity_bonus(s["topic"], recent_topics)
        s["theme_diversity_bonus"] = theme_diversity_bonus(s["theme"], recent_themes)
        is_personal = s["personal_score"] >= 0.5
        # 1 if this candidate matches what we want next (alternate from last post), else 0
        s["alternation_match"] = 1 if (prefer_personal_next and is_personal) or (not prefer_personal_next and not is_personal) else 0

    # Sort: alternation, then theme diversity (so console/TV/listicle get a chance after PC-heavy runs), personal, topic diversity, relevance, upvotes
    candidates.sort(
        key=lambda s: (
            s["alternation_match"],
            s["theme_diversity_bonus"],
            s["personal_score"],
            s["diversity_bonus"],
            s["relevance_score"],
            s.get("upvotes", 0),
        ),
        reverse=True,
    )
    best = candidates[0]

    # Log rejected candidates so you can review what weighting skipped (e.g. to balance PC vs console/TV)
    _log_rejected_candidates(best, candidates[1:], dry_run)

    # Set story_angle for dynamic writer (personal vs news)
    best["story_angle"] = "personal" if best["personal_score"] >= 0.5 else "news"

    # Try to fetch full article text if it's from RSS
    if best["source_type"] == "rss" and best.get("source_url"):
        full_text = fetch_article_text(best["source_url"])
        if full_text:
            best["raw_content"] = full_text

    if not dry_run:
        mark_seen(db, best["id"], best["source_type"], best["title"])
        log.info("Marked as seen: %s", best["title"])

    db.close()
    log.info(
        "Best story: [topic=%s theme=%s angle=%s score=%d] %s",
        best["topic"],
        best.get("theme", "pc_hardware"),
        best["story_angle"],
        best["relevance_score"],
        best["title"],
    )
    return best


def get_top_stories(n: int = 3, dry_run: bool = False) -> List[Dict[str, Any]]:
    """
    Return the top n stories from pulled data (same ranking as get_best_story).
    Does NOT mark stories as seen — caller should mark each after successful publish.
    """
    db = get_db()

    all_stories: List[Dict[str, Any]] = []
    all_stories.extend(scrape_reddit(db, dry_run))
    all_stories.extend(scrape_rss(db, dry_run))

    if not all_stories:
        log.warning("No relevant stories found in this run")
        db.close()
        return []

    existing_posts = load_existing_posts()
    recent_posts = posts_from_last_n_days(existing_posts, SIMILARITY_LOOKBACK_DAYS)
    recent_topics = [infer_topic_for_post(p) for p in recent_posts[:RECENT_N_FOR_DIVERSITY]]
    recent_themes = [infer_theme_for_post(p) for p in recent_posts[:RECENT_N_FOR_DIVERSITY]]

    last_post = _most_recent_post(existing_posts)
    last_was_personal = infer_topic_for_post(last_post) == "personal_build" if last_post else False
    prefer_personal_next = not last_was_personal

    candidates = []
    for s in all_stories:
        sim = similarity_to_existing(s, recent_posts)
        s["similarity_to_existing"] = sim
        if sim >= SIMILARITY_THRESHOLD:
            continue
        candidates.append(s)

    if not candidates:
        log.warning("All candidates were too similar to existing articles")
        db.close()
        return []

    for s in candidates:
        s["topic"] = classify_topic(s)
        s["theme"] = classify_theme(s)
        s["personal_score"] = personal_score(s)
        s["diversity_bonus"] = diversity_bonus(s["topic"], recent_topics)
        s["theme_diversity_bonus"] = theme_diversity_bonus(s["theme"], recent_themes)
        is_personal = s["personal_score"] >= 0.5
        s["alternation_match"] = 1 if (prefer_personal_next and is_personal) or (not prefer_personal_next and not is_personal) else 0

    candidates.sort(
        key=lambda s: (
            s["alternation_match"],
            s["theme_diversity_bonus"],
            s["personal_score"],
            s["diversity_bonus"],
            s["relevance_score"],
            s.get("upvotes", 0),
        ),
        reverse=True,
    )

    top = candidates[:n]
    for s in top:
        s["story_angle"] = "personal" if s["personal_score"] >= 0.5 else "news"
        if s["source_type"] == "rss" and s.get("source_url"):
            full_text = fetch_article_text(s["source_url"])
            if full_text:
                s["raw_content"] = full_text

    db.close()
    log.info("Returning top %d stories (dry_run=%s)", len(top), dry_run)
    return top


def mark_story_seen(story: Dict[str, Any]) -> None:
    """Mark a story as seen in the DB (call after successful publish)."""
    db = get_db()
    mark_seen(db, story["id"], story.get("source_type", ""), story.get("title", ""))
    db.close()
    log.info("Marked as seen: %s", story.get("title", "")[:60])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CtrlAltStock blog scraper")
    parser.add_argument("--dry-run", action="store_true", help="Don't mark stories as seen")
    args = parser.parse_args()

    story = get_best_story(dry_run=args.dry_run)
    if story:
        print(json.dumps(story, indent=2, ensure_ascii=False))
    else:
        print("No story found", file=sys.stderr)
        sys.exit(1)
