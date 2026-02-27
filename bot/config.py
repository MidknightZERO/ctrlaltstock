"""
config.py — Central configuration for the CtrlAltStock blog bot.
Reads environment variables from .env and exposes typed config objects.
"""

import os
from dataclasses import dataclass, field
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the bot/ directory
_BOT_DIR = Path(__file__).parent
load_dotenv(_BOT_DIR / ".env")


@dataclass
class AIConfig:
    provider: str = os.getenv("AI_PROVIDER", "openrouter")  # "openrouter", "openai", or "ollama"

    # OpenRouter (recommended — use free models at https://openrouter.ai/openrouter/free)
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Default to free-tier model; :free models have rate limits (e.g. 20 req/min, 200/day). Pipeline uses 2 calls per article (writer + editor).
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

    # OpenAI Direct
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")

    # Ollama (local LLM on NAS)
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3")


@dataclass
class RedditConfig:
    client_id: str = os.getenv("REDDIT_CLIENT_ID", "")
    client_secret: str = os.getenv("REDDIT_CLIENT_SECRET", "")
    user_agent: str = os.getenv("REDDIT_USER_AGENT", "CtrlAltStock/1.0")
    min_upvotes: int = int(os.getenv("REDDIT_MIN_UPVOTES", "20"))
    min_upvotes_keyless: int = int(os.getenv("REDDIT_MIN_UPVOTES_KEYLESS", "0"))  # /new.json posts rarely have 20+
    # Subreddits to monitor (hardware, gaming, deals)
    subreddits: List[str] = field(default_factory=lambda: [
        "hardware",
        "buildapc",
        "nvidia",
        "Amd",
        "GameDeals",
        "pcgaming",
        "gadgets",
        "technology",
        "StockMarket",
        "PS5",
        "XboxSeriesX",
    ])


@dataclass
class RSSConfig:
    lookback_hours: int = int(os.getenv("RSS_LOOKBACK_HOURS", "6"))
    feeds: List[dict] = field(default_factory=lambda: [
        {"name": "Tom's Hardware",      "url": "https://www.tomshardware.com/feeds/all"},
        {"name": "HotHardware",         "url": "https://hothardware.com/rss/news.aspx"},
        {"name": "Hexus",               "url": "https://hexus.net/rss/"},
        {"name": "The Verge Tech",      "url": "https://www.theverge.com/rss/tech/index.xml"},
        {"name": "Ars Technica",        "url": "https://feeds.arstechnica.com/arstechnica/technology-lab"},
        {"name": "Eurogamer",           "url": "https://www.eurogamer.net/?format=rss"},
        {"name": "WCCFTech",            "url": "https://wccftech.com/feed/"},
    ])


@dataclass
class AmazonConfig:
    access_key: str = os.getenv("AMAZON_ACCESS_KEY", "")
    secret_key: str = os.getenv("AMAZON_SECRET_KEY", "")
    partner_tag: str = os.getenv("AMAZON_PARTNER_TAG", "ctrlaltstock-21")
    region: str = os.getenv("AMAZON_REGION", "uk")
    marketplace: str = os.getenv("AMAZON_MARKETPLACE", "webservices.amazon.co.uk")


@dataclass
class UnsplashConfig:
    access_key: str = os.getenv("UNSPLASH_ACCESS_KEY", "")
    base_url: str = "https://api.unsplash.com"


@dataclass
class GitConfig:
    repo_path: str = os.getenv("REPO_PATH", str(_BOT_DIR.parent))
    remote: str = os.getenv("GIT_REMOTE", "origin")
    branch: str = os.getenv("GIT_BRANCH", "main")


@dataclass
class BotConfig:
    articles_per_run: int = int(os.getenv("ARTICLES_PER_RUN", "3"))
    article_min_words: int = int(os.getenv("ARTICLE_MIN_WORDS", "800"))
    article_max_words: int = int(os.getenv("ARTICLE_MAX_WORDS", "1200"))
    discord_webhook_url: str = os.getenv("DISCORD_WEBHOOK_URL", "")
    build_hook_url: str = os.getenv("BUILD_HOOK_URL", "")
    image_reuse_lookback_days: int = int(os.getenv("IMAGE_REUSE_LOOKBACK_DAYS", "7"))

    # Paths (relative to repo root)
    posts_dir: str = "src/blog/posts"
    blog_json_path: str = "public/blog-posts.json"
    db_path: str = str(_BOT_DIR / "seen_posts.db")
    logs_dir: str = str(_BOT_DIR / "logs")
    drafts_dir: str = str(_BOT_DIR / ".tmp" / "drafts")

    # Site info
    site_name: str = "CtrlAltStock"
    site_url: str = "https://ctrlaltstock.com"
    author_name: str = "CtrlAltStock Team"
    author_avatar: str = "https://ctrlaltstock.com/logo.png"
    author_bio: str = "The CtrlAltStock team monitors tech hardware prices and stock levels 24/7 so you don't have to."

    # Hardware relevance keywords for scoring news stories
    relevance_keywords: List[str] = field(default_factory=lambda: [
        "gpu", "graphics card", "rtx", "rx", "nvidia", "amd", "intel",
        "cpu", "processor", "ryzen", "core i",
        "motherboard", "ram", "ddr5", "ddr4",
        "ssd", "nvme", "storage",
        "playstation", "ps5", "xbox", "series x", "nintendo", "switch",
        "steam deck", "asus rog ally",
        "stock", "restock", "shortage", "available", "price drop",
        "release date", "launch", "announced",
        "rtx 5090", "rtx 5080", "rtx 4090", "rtx 4080",
        "rx 9070", "rx 7900", "arc", "battlemage",
    ])

    # Topic classification for diversity and personal-story preference
    driver_update_keywords: List[str] = field(default_factory=lambda: [
        "driver", "adrenalin", "release notes", "nvidia driver", "amd driver",
        "geforce game ready", "optional update", "patch notes",
    ])
    personal_story_keywords: List[str] = field(default_factory=lambda: [
        "first build", "my first", "finally built", "build complete", "build log",
        "upgrade journey", "proud", "finally", "my build", "completed my",
        "first pc", "first gaming pc", "budget build", "building my",
    ])
    deal_keywords: List[str] = field(default_factory=lambda: [
        "deal", "discount", "price drop", "on sale", "cheapest",
        "save £", "save $", "bargain", "steal", "under £",
    ])
    review_keywords: List[str] = field(default_factory=lambda: [
        "review", " vs ", " versus ", "comparison", "benchmark",
    ])

    # Theme for content mix: we want consoles, TVs, general tech / listicles, not just PC hardware
    theme_console_keywords: List[str] = field(default_factory=lambda: [
        "playstation", "ps5", "ps4", "xbox", "series x", "series s", "nintendo", "switch",
        "steam deck", "rog ally", "console", "handheld",
    ])
    theme_tv_keywords: List[str] = field(default_factory=lambda: [
        "tv", "television", "oled", "qled", "smart tv", "4k tv", "lg oled", "samsung tv",
    ])
    theme_listicle_keywords: List[str] = field(default_factory=lambda: [
        "top 5", "top 10", "best of", "best ", "roundup", "round-up", "listicle",
        "best budget", "best gaming", "best monitors", "best tvs", "best ssds",
    ])


# Global config instances
ai = AIConfig()
reddit = RedditConfig()
rss = RSSConfig()
amazon = AmazonConfig()
unsplash = UnsplashConfig()
git = GitConfig()
bot = BotConfig()
