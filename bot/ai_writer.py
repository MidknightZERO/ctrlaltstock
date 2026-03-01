"""
ai_writer.py — Drafts a blog article from a StoryBrief using AI.

Provider priority:
  1. OpenAI (GPT-4o) — if AI_PROVIDER=openai or if Ollama fails
  2. Ollama (local LLM) — if AI_PROVIDER=ollama

Output: a dict with 'frontmatter' (dict) and 'content' (str markdown body).

Usage:
    python ai_writer.py --test    # Generates a test article to stdout
"""

import json
import sys
import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pathlib import Path

import httpx
from openai import OpenAI
from slugify import slugify
from tenacity import retry, stop_after_attempt, wait_exponential

import config
from utils import strip_markdown_from_title, sanitize_article_content

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [ai_writer] %(levelname)s %(message)s")

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are the lead content writer for CtrlAltStock, a UK-based tech hardware tracking service with a 10,000-member Discord community. 

Your brand voice:
- Knowledgeable but conversational — you're speaking to PC enthusiasts and budget-conscious gamers
- Community-focused — regularly reference the CtrlAltStock Discord where members share tips and alerts
- Practical and actionable — always give readers something useful to do (watch a product, set a price alert, join a Discord discussion)
- Enthusiastic about hardware without being a fanboy — cover NVIDIA, AMD, Intel, AMD CPUs, consoles equally
- Use UK English spelling (colour, favourite, analyse, etc.)
- When the story is a personal or community experience from Reddit (e.g. first build, upgrade journey), report it as news: use third person, quote the user ("A Reddit user said..."), never use first person. Frame it as "A user on r/buildapc shared..." or "One community member is quoted as saying...". When it's straight product/news, keep the factual structure.
- When referring to the present or "this year", use the actual current year (the publication date will be set to today).

Article structure (always follow this):
1. H1 title (compelling, SEO-friendly, includes the product/topic name)
2. Hook paragraph (2–3 sentences, why this matters RIGHT NOW for bargain hunters)
3. H2: What's the story? (3–5 paragraphs covering the news)
4. H2: What does this mean for prices? (price/availability analysis)
5. H2: Our recommendation / What to buy right now (specific buying advice)
6. H2: Final thoughts (brief wrap-up, call to action to join Discord)

Requirements (non-negotiable):
- Word count: strictly 800–1200 words for the article body. Short articles are rejected; aim for at least 800 words before the JSON block. Expand each section with concrete detail.
- You MUST output the full article markdown first; never reply with only the JSON block.
- Include at least 3 specific product names with model numbers
- All prices in GBP (£) only — our audience is UK. Use pounds sterling throughout; do not use USD.
- Add a Discord CTA: "Join our 10,000-member CtrlAltStock Discord for live stock alerts"
- Use bullet points and subheadings liberally — scannable content
- **Topic consistency**: The article body MUST be about the given HEADLINE/source story only. Do not write about a different product or deal. suggested_title and excerpt must describe the same topic as the body.
- At the end of your response, include a JSON block like this (delimited by ```json and ```) with metadata:
{
  "suggested_title": "SEO-friendly article title (can differ from the headline)",
  "suggested_slug": "article-url-slug-goes-here",
  "excerpt": "One to two sentence summary for listing pages.",
  "tags": ["GPU", "NVIDIA", "RTX 4090", "Price Drop"],
  "featured_product_keywords": ["RTX 4090", "RTX 4080 Super"],
  "amazon_search_queries": ["NVIDIA RTX 4090 graphics card", "RTX 4080 Super GPU"],
  "image_search_queries": ["Nintendo Switch game case", "Avatar game cover", "Xbox console"],
  "related_topics": ["rtx-5090-revealed", "best-gpus-value"]
}

The image_search_queries field is required: 2–4 short phrases derived from the article content (product names, main subject, setting) for image search. Examples: "Nintendo Switch game case", "Avatar game cover", "Xbox console", "graphics card gaming".
"""

# ── AI call helpers ───────────────────────────────────────────────────────────

AI_REQUEST_TIMEOUT = 90  # seconds — prevent indefinite hangs on slow/rate-limited APIs

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def call_openrouter(prompt: str, system: str) -> str:
    """Call OpenRouter API (OpenAI-compatible, access to many models)."""
    client = OpenAI(
        api_key=config.ai.openrouter_api_key,
        base_url=config.ai.openrouter_base_url,
        default_headers={
            "HTTP-Referer": config.bot.site_url,
            "X-Title": config.bot.site_name,
        },
        timeout=AI_REQUEST_TIMEOUT,
    )
    response = client.chat.completions.create(
        model=config.ai.openrouter_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.75,
        max_tokens=2500,
    )
    return response.choices[0].message.content


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def call_openai(prompt: str, system: str) -> str:
    client = OpenAI(api_key=config.ai.openai_api_key, timeout=AI_REQUEST_TIMEOUT)
    response = client.chat.completions.create(
        model=config.ai.openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.75,
        max_tokens=2500,
    )
    return response.choices[0].message.content


@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=5))
def call_ollama(prompt: str, system: str) -> str:
    payload = {
        "model": config.ai.ollama_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }
    resp = httpx.post(
        f"{config.ai.ollama_base_url}/api/chat",
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def call_ai(prompt: str, system: str = SYSTEM_PROMPT) -> str:
    """
    Call AI with provider priority:
      1. OpenRouter (if AI_PROVIDER=openrouter)
      2. OpenAI direct (if AI_PROVIDER=openai)
      3. Ollama local (if AI_PROVIDER=ollama, or as final fallback)
    """
    if config.ai.provider == "openrouter":
        try:
            log.info("Calling OpenRouter (%s)...", config.ai.openrouter_model)
            return call_openrouter(prompt, system)
        except Exception as e:
            log.warning("OpenRouter failed (%s), falling back to Ollama", e)
            return call_ollama(prompt, system)

    if config.ai.provider == "ollama":
        try:
            log.info("Calling Ollama (%s)...", config.ai.ollama_model)
            return call_ollama(prompt, system)
        except Exception as e:
            log.warning("Ollama failed (%s), falling back to OpenAI", e)

    log.info("Calling OpenAI (%s)...", config.ai.openai_model)
    return call_openai(prompt, system)


# Minimum words from writer; below this we abort (no refiner/publish) to avoid padding crap
MIN_DRAFT_WORDS = 100

# ── Tag inference (fallback when AI omits tags) ───────────────────────────────

# Keyword -> display tag. Longer phrases first so "rtx 5090" matches before "rtx".
_TAG_KEYWORDS = [
    ("rtx 5090", "RTX 5090"), ("rtx 5080", "RTX 5080"), ("rtx 4090", "RTX 4090"), ("rtx 4080", "RTX 4080"),
    ("rx 9070", "RX 9070"), ("rx 9060", "RX 9060"), ("rx 7900", "RX 7900"), ("rx 7800", "RX 7800"), ("rx 7600", "RX 7600"),
    ("radeon rx", "AMD Radeon"), ("geforce rtx", "NVIDIA GeForce"),
    ("nvidia", "NVIDIA"), ("amd", "AMD"), ("intel", "Intel"),
    ("gpu", "GPU"), ("graphics card", "GPU"), ("cpu", "CPU"), ("processor", "CPU"),
    ("ryzen", "AMD Ryzen"), ("zen 6", "AMD Zen 6"), ("zen 5", "AMD Zen 5"),
    ("core i", "Intel Core"), ("ddr5", "DDR5"), ("ddr4", "DDR4"),
    ("ram", "RAM"), ("motherboard", "Motherboard"), ("ssd", "SSD"), ("nvme", "NVMe"),
    ("playstation", "PlayStation"), ("ps5", "PS5"), ("ps4", "PS4"),
    ("xbox", "Xbox"), ("series x", "Xbox Series X"), ("nintendo", "Nintendo"), ("switch", "Nintendo Switch"),
    ("steam deck", "Steam Deck"), ("rog ally", "ROG Ally"),
    ("driver", "Driver Update"), ("adrenalin", "AMD Adrenalin"), ("release notes", "Driver Update"),
    ("overclock", "Overclocking"), ("frequency", "Overclocking"),
    ("shortage", "Stock"), ("price drop", "Price Drop"), ("deal", "Deal"),
    ("review", "Review"), ("benchmark", "Benchmark"),
]


def _infer_tags_from_content(title: str, content: str, max_tags: int = 8) -> List[str]:
    """Infer tags from title + content using keyword matching. No AI call."""
    text = f"{title} {content[:800]}".lower()
    seen = set()
    tags = []
    for keyword, display in _TAG_KEYWORDS:
        if len(tags) >= max_tags:
            break
        if keyword in text and display not in seen:
            seen.add(display)
            tags.append(display)
    return tags


# ── JSON metadata extraction ──────────────────────────────────────────────────

def extract_metadata(raw_output: str) -> tuple[str, Dict[str, Any]]:
    """Separate the article markdown from the trailing JSON metadata block."""
    meta = {
        "suggested_title": "",
        "suggested_slug": "",
        "excerpt": "",
        "tags": [],
        "featured_product_keywords": [],
        "amazon_search_queries": [],
        "image_search_queries": [],
        "related_topics": [],
    }
    if not (raw_output and raw_output.strip()):
        return "", meta

    content = raw_output.strip()

    # Model may put JSON first (wrong) or at end (correct). Prefer article before ```json.
    if "```json" in content:
        parts = content.rsplit("```json", 1)
        before_json = parts[0].strip()
        json_part = parts[1].split("```")[0].strip()
        # Article must be the long part; if model put JSON first, before_json is empty/short
        if len(before_json.split()) >= MIN_DRAFT_WORDS:
            content = before_json
        else:
            # Try: maybe article is after the JSON block
            after_json = parts[1].split("```", 1)[-1].strip() if "```" in parts[1] else ""
            if after_json and len(after_json.split()) >= MIN_DRAFT_WORDS:
                content = after_json
            else:
                content = before_json  # use whatever we have; validation will catch if too short
        try:
            meta = {**meta, **json.loads(json_part)}
        except json.JSONDecodeError as e:
            log.warning("Could not parse AI metadata JSON: %s", e)

    return content, meta


# ── Article assembly ──────────────────────────────────────────────────────────

def build_prompt(story: Dict[str, Any]) -> str:
    source_label = f"r/{story.get('subreddit', 'hardware')}" if story.get("source_type") == "reddit" else story.get("source_name", "Tech News")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    base = f"""Write a full blog article for CtrlAltStock based on the following news story.

TODAY'S DATE: {today} — Use this year for any references to "this year", "current", or present-day context so the article does not feel dated.

SOURCE: {source_label}
HEADLINE: {story['title']}
SUMMARY: {story.get('summary', '')}
ADDITIONAL CONTEXT: {story.get('raw_content', '')[:1500]}
ORIGINAL URL: {story.get('source_url', '')}
"""
    if story.get("story_angle") == "personal":
        base += """
This is a personal or community story from Reddit. Frame it as NEWS: report on the user's experience in third person. NEVER use first person (I, we, my, our). Write as: "A user on Reddit is quoted as saying 'This is the best' while describing their setup" or "One community member shared that they finally completed their first build." Lead with the human angle and emotional payoff, but always as a reporter quoting or describing someone else. Tie product recommendations to what would help readers achieve a similar outcome. Keep the article structure but emphasise the personal journey as reported news.
"""
    base += """
Follow the article structure and brand voice guidelines exactly. Use GBP (£) for all prices — UK audience only.
You must write at least 800 words of article body (expand each section with detail); then add the JSON metadata block at the end.
"""
    return base


MAX_WRITER_ATTEMPTS = 3


def write_article(story: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a blog article from a story brief.
    Retries up to MAX_WRITER_ATTEMPTS on empty/short or JSON-only output (API may route to weaker LLM).
    Returns a dict with:
      - frontmatter (dict) — all YAML frontmatter fields
      - content (str) — the markdown body
      - amazon_search_queries (list)
    """
    prompt = build_prompt(story)
    last_error = None
    for attempt in range(1, MAX_WRITER_ATTEMPTS + 1):
        try:
            log.info("Generating article for: %s (attempt %d/%d)", story["title"], attempt, MAX_WRITER_ATTEMPTS)
            raw = call_ai(prompt)
            if not raw or not raw.strip():
                raise ValueError("Writer returned empty response.")
            content, meta = extract_metadata(raw)
            word_count = len(content.split())
            if word_count < MIN_DRAFT_WORDS:
                raise ValueError(
                    "Writer returned insufficient content (%d words). Minimum %d required."
                    % (word_count, MIN_DRAFT_WORDS)
                )
            break
        except ValueError as e:
            last_error = e
            log.warning("Writer attempt %d/%d failed: %s", attempt, MAX_WRITER_ATTEMPTS, e)
            if attempt == MAX_WRITER_ATTEMPTS:
                log.error("Writer failed all %d attempts — aborting", MAX_WRITER_ATTEMPTS)
                raise ValueError(
                    "Writer failed after %d attempts. Last error: %s. Aborting to avoid publishing empty or padded articles."
                    % (MAX_WRITER_ATTEMPTS, last_error)
                ) from last_error
            continue

    # Build slug
    slug = meta.get("suggested_slug") or slugify(story["title"])[:80]

    # Tags: use AI-provided tags, or infer from title/content when empty (no extra AI call)
    tags = meta.get("tags") or []
    if not tags:
        draft_title = strip_markdown_from_title(
            (meta.get("suggested_title") or "").strip() or story["title"]
        )
        tags = _infer_tags_from_content(title=draft_title, content=content)

    # Build frontmatter (use AI-suggested title when present for better SEO)
    # Strip any leading markdown (#, ##, etc.) — AI sometimes returns "# Title"
    title = strip_markdown_from_title(
        (meta.get("suggested_title") or "").strip() or story["title"]
    )
    # Strip ```markdown wrappers and redundant leading H1 — AI sometimes wraps content in code blocks
    content = sanitize_article_content(content, title)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    frontmatter = {
        "title": title,
        "date": today,
        "author": {
            "name": config.bot.author_name,
            "avatar": config.bot.author_avatar,
            "bio": config.bot.author_bio,
        },
        "excerpt": meta.get("excerpt", ""),
        "tags": tags,
        "slug": slug,
        "coverImage": "",          # filled by image_fetcher
        "images": [],              # filled by image_fetcher
        "amazonProducts": [],      # filled by amazon_linker
        "featuredProductId": "",   # filled by amazon_linker
        "recommendedProductIds": [],
        "relatedPostSlugs": meta.get("related_topics", []),
        "readingTime": f"{max(1, len(content.split()) // 200)} min read",
        "sourceUrl": story.get("source_url", ""),
        "autoGenerated": True,
    }

    return {
        "slug": slug,
        "frontmatter": frontmatter,
        "content": content,
        "amazon_search_queries": meta.get("amazon_search_queries", []),
        "image_search_queries": meta.get("image_search_queries", []),
        "featured_product_keywords": meta.get("featured_product_keywords", []),
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="Generate a test article")
    parser.add_argument("--story", help="Path to a JSON story brief file")
    args = parser.parse_args()

    if args.test:
        test_story = {
            "title": "NVIDIA RTX 5090 Launch: Prices, Availability & Should You Buy One?",
            "summary": "NVIDIA has officially launched the RTX 5090 at £1,999. Demand is sky high and stock is extremely limited.",
            "source_url": "https://reddit.com/r/hardware",
            "source_type": "reddit",
            "subreddit": "hardware",
            "raw_content": "The RTX 5090 launched today with initial reviews showing 40% performance uplift over the 4090. Stock sold out in minutes on most retailers.",
        }
        result = write_article(test_story)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.story:
        story = json.loads(Path(args.story).read_text())
        result = write_article(story)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        # Read story from stdin
        story = json.loads(sys.stdin.read())
        result = write_article(story)
        print(json.dumps(result, indent=2, ensure_ascii=False))
