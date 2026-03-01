"""
backfill_content.py — Deterministic backfill of tags, internal links, Amazon affiliate links, and images.

Zero AI calls. Scales to any number of posts.

- Tags: Uses keyword inference (same as ai_writer) when tags are empty
- Internal links: Phrase-matching — extract linkable phrases from each post (title, tags)
- Amazon links: When paragraphs mention products directly, add inline affiliate links
- Fix Amazon images: Populate empty imageUrl for products by fetching from Amazon search

Usage:
    python bot/backfill_content.py           # Fix tags + internal + amazon links
    python bot/backfill_content.py --tags-only
    python bot/backfill_content.py --links-only      # internal + amazon
    python bot/backfill_content.py --amazon-links-only
    python bot/backfill_content.py --no-amazon-links # internal only
    python bot/backfill_content.py --fix-amazon-images  # Populate product images
    python bot/backfill_content.py --images-only       # Re-fetch cover images (topic-aware, 7-day exclusion)
"""

import json
import re
import sys
import time
import logging
import logging.handlers
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Set

import frontmatter as fm

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            Path(config.bot.logs_dir) / "backfill.log",
            encoding="utf-8", maxBytes=10_000_000, backupCount=3
        ),
    ],
)
log = logging.getLogger(__name__)

SITE_BASE_URL = getattr(config.bot, "site_url", "https://ctrlaltstock.com").rstrip("/")

# Validation report written by validate_existing_content.py; backfill uses it for distribution-aware linking
VALIDATION_REPORT_PATH = _BOT_DIR / ".tmp" / "validation-report.json"
# Fix list written by generate_fix_list.py; backfill --images-only uses it for AI-generated image search terms
FIX_LIST_PATH = _BOT_DIR / ".tmp" / "fix-list.json"


def load_validation_report() -> Dict[str, Any]:
    """Load validation report if present. Returns {"posts": {slug: {...}}} or empty dict."""
    if not VALIDATION_REPORT_PATH.exists():
        return {}
    try:
        data = json.loads(VALIDATION_REPORT_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as e:
        log.warning("Could not load validation report %s: %s", VALIDATION_REPORT_PATH, e)
        return {}


def load_fix_list() -> Dict[str, Any]:
    """Load fix list if present (from generate_fix_list.py). Returns {"posts": {slug: {"image_search_queries": [...]}}} or empty."""
    if not FIX_LIST_PATH.exists():
        return {}
    try:
        data = json.loads(FIX_LIST_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as e:
        log.warning("Could not load fix list %s: %s", FIX_LIST_PATH, e)
        return {}


def load_posts() -> List[Tuple[Path, fm.Post]]:
    """Load all markdown posts from posts_dir. Returns [(filepath, Post), ...]."""
    posts_dir = Path(config.git.repo_path) / config.bot.posts_dir
    if not posts_dir.exists():
        log.warning("Posts dir not found: %s", posts_dir)
        return []
    result = []
    for p in sorted(posts_dir.glob("*.md")):
        try:
            post = fm.load(p)
            result.append((p, post))
        except Exception as e:
            log.warning("Could not load %s: %s", p.name, e)
    return result


def fix_tags(post: fm.Post) -> bool:
    """If tags empty, infer from content. Returns True if changed."""
    tags = post.get("tags") or []
    if tags:
        return False
    from ai_writer import _infer_tags_from_content
    title = post.get("title", "")
    content = post.content or ""
    inferred = _infer_tags_from_content(title, content)
    if inferred:
        post["tags"] = inferred
        return True
    return False


def fix_placeholder_excerpt(post: fm.Post) -> bool:
    """If excerpt is missing or placeholder '---', set from first line of body (word-boundary). Returns True if changed."""
    from utils import strip_excerpt_prompt_artifacts
    existing = (post.get("excerpt") or "").strip()
    if existing and existing != "---":
        return False
    content = post.content or ""
    lines = [l.strip() for l in content.split("\n") if l.strip() and not l.startswith("#")]
    if not lines:
        return False
    first_line = strip_excerpt_prompt_artifacts(lines[0])
    if not first_line:
        return False
    max_len = 200
    if len(first_line) > max_len:
        truncated = first_line[: max_len + 1].rsplit(" ", 1)[0]
        new_excerpt = truncated if len(truncated) >= 50 else first_line[:max_len]
    else:
        new_excerpt = first_line
    post["excerpt"] = new_excerpt
    return True


def fix_mismatched_excerpt(post: fm.Post) -> bool:
    """If excerpt clearly describes a different topic than the title (e.g. Avatar text on Xbox title), set excerpt to title-based fallback. Returns True if changed."""
    title = (post.get("title") or "").strip()
    excerpt = (post.get("excerpt") or "").strip()
    if not title or not excerpt or excerpt == "---":
        return False
    title_lower = title.lower()
    excerpt_lower = excerpt.lower()
    # Mismatch: title about X but excerpt about Y (e.g. Xbox vs Avatar/Nintendo deal)
    mismatch = False
    if "xbox" in title_lower and ("avatar" in excerpt_lower or "nintendo switch" in excerpt_lower or "£9.99" in excerpt_lower or "9.99" in excerpt_lower):
        mismatch = True
    if "geforce" in title_lower or "radeon" in title_lower or "ryzen" in title_lower or "amd " in title_lower:
        if "avatar" in excerpt_lower or ("nintendo" in excerpt_lower and "switch" in excerpt_lower):
            mismatch = True
    if mismatch:
        post["excerpt"] = title + "." if not title.endswith(".") else title
        return True
    return False


def extract_phrases(slug: str, title: str, tags: List[str]) -> List[str]:
    """Extract linkable phrases from a post. Longer phrases first for better matching."""
    phrases = []
    # Tags are good link anchors
    for t in (tags or []):
        if t and len(str(t).strip()) > 1:
            phrases.append(str(t).strip())
    # Title and key parts
    if title:
        phrases.append(title.strip())
        # Also add parts split by common delimiters
        for sep in (" – ", " - ", ": ", " | "):
            if sep in title:
                for part in title.split(sep):
                    p = part.strip()
                    if p and len(p) > 3 and p not in phrases:
                        phrases.append(p)
    # Dedupe and sort by length descending (longer = more specific)
    seen = set()
    unique = []
    for p in phrases:
        key = p.lower()
        if key not in seen and len(p) >= 2:
            seen.add(key)
            unique.append(p)
    return sorted(unique, key=len, reverse=True)


def get_link_spans(content: str) -> List[Tuple[int, int]]:
    """Return (start, end) spans of markdown link text [text](url) - we skip replacing inside these."""
    spans = []
    for m in re.finditer(r"\[([^\]]*)\]\([^)]*\)", content):
        spans.append((m.start(), m.end()))
    return spans


def is_inside_link(pos: int, spans: List[Tuple[int, int]]) -> bool:
    """True if position pos is inside any link span."""
    for start, end in spans:
        if start <= pos < end:
            return True
    return False


def get_h1_span(content: str) -> Optional[Tuple[int, int]]:
    """Return (start, end) of the first H1 line (# Title), or None."""
    m = re.search(r"^# .+$", content, re.MULTILINE)
    if not m:
        return None
    return (m.start(), m.end())


def strip_links_from_h1(content: str) -> str:
    """Remove link markup from the first H1 line: [text](url) -> text."""
    h1_span = get_h1_span(content)
    if not h1_span:
        return content
    start, end = h1_span
    h1_line = content[start:end]
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", h1_line)
    if cleaned == h1_line:
        return content
    return content[:start] + cleaned + content[end:]


def strip_internal_links(content: str) -> str:
    """Remove all internal blog links [text](url) -> text so we can re-add with distribution."""
    base = re.escape(SITE_BASE_URL)
    return re.sub(r"\[([^\]]+)\]\(\s*" + base + r"/blog/[^)]+\)", r"\1", content)


def _has_sentence_between_spans(para: str, s1: int, e1: int, s2: int, e2: int) -> bool:
    """True if the gap between span (s1,e1) and span (s2,e2) contains a sentence boundary ([.!?] + whitespace)."""
    if e1 < s2:
        between = para[e1:s2]
    elif e2 < s1:
        between = para[e2:s1]
    else:
        return False
    return bool(re.search(r"[.!?]\s+", between))


def insert_internal_links(
    content: str,
    phrase_to_slug_url: List[Tuple[str, str, str]],  # (phrase, slug, url)
    exclude_slug: str,
    max_links: int,
    distribution_aware: bool = False,
) -> str:
    """
    Insert internal links by phrase matching. Each phrase used at most once per article.
    Max 2 links per paragraph, at least one sentence apart.
    When distribution_aware is True: first add links only in paragraphs after the first 30% of content;
    then if slots remain, add links in the first 30% so we don't bunch all links at the top.
    """
    paragraphs = content.split("\n\n")
    total_len = len(content)
    first_30_threshold = int(total_len * 0.3) if distribution_aware else 0
    links_added = 0
    used_phrases: Set[str] = set()
    pos = 0
    # Precompute paragraph start positions for distribution-aware logic
    para_starts: List[int] = []
    for para in paragraphs:
        para_starts.append(pos)
        pos += len(para) + 2

    def add_links_in_paragraphs(allowed_indices: List[int]) -> None:
        """Add links in paragraphs at allowed_indices; updates paragraphs, links_added, used_phrases in closure."""
        nonlocal links_added
        for i in allowed_indices:
            if links_added >= max_links:
                return
            para = paragraphs[i]
            if re.match(r"^# .+$", para.strip()):
                continue
            links_in_para = 0
            while links_in_para < 2 and links_added < max_links:
                link_spans = get_link_spans(para)
                found = False
                for phrase, slug, url in phrase_to_slug_url:
                    if slug == exclude_slug:
                        continue
                    if phrase.lower() in used_phrases:
                        continue
                    pattern = r"\b" + re.escape(phrase) + r"\b"
                    m = re.search(pattern, para, re.IGNORECASE)
                    if not m:
                        continue
                    if is_inside_link(m.start(), link_spans):
                        continue
                    if links_in_para >= 1:
                        if not all(
                            _has_sentence_between_spans(para, lp[0], lp[1], m.start(), m.end())
                            for lp in link_spans
                        ):
                            continue
                    before = para[: m.start()]
                    after = para[m.end() :]
                    original = para[m.start() : m.end()]
                    replacement = f"[{original}]({url})"
                    para = before + replacement + after
                    paragraphs[i] = para
                    used_phrases.add(phrase.lower())
                    links_in_para += 1
                    links_added += 1
                    found = True
                    break
                if not found:
                    break

    if distribution_aware and first_30_threshold > 0:
        # Pass 1: only paragraphs in the last 70% of content
        later_indices = [i for i in range(len(paragraphs)) if para_starts[i] >= first_30_threshold]
        add_links_in_paragraphs(later_indices)
        # Pass 2: fill remaining slots in the first 30%
        if links_added < max_links:
            first_indices = [i for i in range(len(paragraphs)) if para_starts[i] < first_30_threshold]
            add_links_in_paragraphs(first_indices)
    else:
        # Single pass, any paragraph
        add_links_in_paragraphs(list(range(len(paragraphs))))

    return "\n\n".join(paragraphs)


def build_phrase_index(posts: List[Tuple[Path, fm.Post]]) -> List[Tuple[str, str, str]]:
    """
    Build (phrase, slug, url) list for all posts. Sorted by phrase length descending.
    Longer phrases first so "RTX 5090" matches before "RTX".
    """
    entries = []
    for path, post in posts:
        slug = post.get("slug") or path.stem
        title = post.get("title", "")
        tags = post.get("tags") or []
        url = f"{SITE_BASE_URL}/blog/{slug}"
        for phrase in extract_phrases(slug, title, tags):
            if len(phrase) >= 2:
                entries.append((phrase, slug, url))
    # Sort by phrase length descending
    entries.sort(key=lambda x: len(x[0]), reverse=True)
    return entries


def extract_product_phrases(product: Dict[str, Any]) -> List[str]:
    """
    Extract linkable phrases from a product (amazonProducts or affiliate-products format).
    Longer phrases first for better matching. Includes model identifiers (e.g. RX 7800 XT).
    """
    phrases = []
    name = (product.get("name") or product.get("title") or product.get("query") or "").strip()
    query = (product.get("query") or name).strip()
    tags = product.get("tags") or []
    for t in tags:
        if t and len(str(t).strip()) > 2:
            phrases.append(str(t).strip())
    if name:
        phrases.append(name)
    if query and query not in phrases:
        phrases.append(query)
    for sep in (" – ", " - ", ": ", " | "):
        if sep in name:
            for part in name.split(sep):
                p = part.strip()
                if p and len(p) > 3 and p not in phrases:
                    phrases.append(p)
    parts = name.split()
    for n in (3, 2):
        if len(parts) >= n:
            sub = " ".join(parts[-n:])
            if re.search(r"\d", sub) and sub not in phrases:
                phrases.append(sub)
    seen = set()
    unique = []
    for p in phrases:
        key = p.lower()
        if key not in seen and len(p) >= 2:
            seen.add(key)
            unique.append(p)
    return sorted(unique, key=len, reverse=True)


def _phrase_set_from_index(phrase_to_url: List[Tuple[str, str]]) -> Set[str]:
    """All phrase strings (lowercase) from the index."""
    return {p[0].lower() for p in phrase_to_url}


def insert_amazon_links(
    content: str,
    phrase_to_url: List[Tuple[str, str]],  # (phrase, affiliate_url)
    max_links: int,
) -> str:
    """
    Insert Amazon affiliate links by phrase matching. Each phrase at most once per article.
    Max 2 links per paragraph, at least one sentence apart.
    """
    paragraphs = content.split("\n\n")
    links_added = 0
    used_phrases: Set[str] = set()
    all_phrases = _phrase_set_from_index(phrase_to_url)

    def mark_used(phrase: str) -> None:
        used_phrases.add(phrase.lower())
        for other in all_phrases:
            if other != phrase.lower() and other in phrase.lower():
                used_phrases.add(other)

    for i, para in enumerate(paragraphs):
        if links_added >= max_links:
            break
        if re.match(r"^# .+$", para.strip()):
            continue

        links_in_para = 0

        while links_in_para < 2 and links_added < max_links:
            link_spans = get_link_spans(para)
            found = False
            for phrase, url in phrase_to_url:
                if phrase.lower() in used_phrases:
                    continue
                # Word-boundary match: "RAM" must not match inside "Ramifications"
                pattern = r"\b" + re.escape(phrase) + r"\b"
                m = re.search(pattern, para, re.IGNORECASE)
                if not m:
                    continue
                if is_inside_link(m.start(), link_spans):
                    continue
                if links_in_para >= 1:
                    if not all(
                        _has_sentence_between_spans(
                            para, lp[0], lp[1], m.start(), m.end()
                        )
                        for lp in link_spans
                    ):
                        continue
                before = para[: m.start()]
                after = para[m.end() :]
                original = para[m.start() : m.end()]
                replacement = f"[{original}]({url})"
                para = before + replacement + after
                paragraphs[i] = para
                mark_used(phrase)
                links_in_para += 1
                links_added += 1
                found = True
                break
            if not found:
                break

    return "\n\n".join(paragraphs)


AFFILIATE_PRODUCTS_PATH = Path(config.git.repo_path) / "public" / "affiliate-products.json"


def _load_affiliate_products_fallback() -> List[Dict[str, Any]]:
    """Load products from affiliate-products.json when post has no amazonProducts."""
    if not AFFILIATE_PRODUCTS_PATH.exists():
        return []
    try:
        data = json.loads(AFFILIATE_PRODUCTS_PATH.read_text(encoding="utf-8"))
        return data.get("products", [])
    except Exception as e:
        log.warning("Could not load affiliate-products.json: %s", e)
        return []


def _build_amazon_phrase_index(products: List[Dict[str, Any]]) -> List[Tuple[str, str]]:
    """Build (phrase, affiliate_url) list from products. Sorted by phrase length descending."""
    entries = []
    for p in products:
        url = p.get("affiliateUrl") or p.get("url") or ""
        if not url:
            continue
        if "amazon" not in url.lower():
            continue
        for phrase in extract_product_phrases(p):
            if len(phrase) >= 2:
                entries.append((phrase, url))
    entries.sort(key=lambda x: len(x[0]), reverse=True)
    return entries


def add_amazon_links_to_post(
    post: fm.Post,
    path: Path,
    max_links: int = 5,
) -> bool:
    """Add inline Amazon affiliate links when products are mentioned. Returns True if changed."""
    products = post.get("amazonProducts") or []
    if not products:
        curated = _load_affiliate_products_fallback()
        partner_tag = getattr(config.amazon, "partner_tag", "ctrlaltstock-21")
        region = getattr(config.amazon, "region", "uk")
        from amazon_linker import build_amazon_search_url
        products = []
        for p in curated:
            url = p.get("url") or build_amazon_search_url(
                p.get("name", ""), partner_tag, region
            )
            products.append({
                "name": p.get("name", ""),
                "affiliateUrl": url,
                "url": url,
                "tags": p.get("tags", []),
            })
    if not products:
        return False

    content = post.content or ""
    amazon_pattern = re.escape("amazon.co.uk") + r"|" + re.escape("amazon.com")
    existing_count = len(re.findall(r"\]\s*\([^)]*" + amazon_pattern, content))
    if existing_count >= max_links:
        return False

    phrase_index = _build_amazon_phrase_index(products)
    if not phrase_index:
        return False

    slots = max(0, max_links - existing_count)
    new_content = insert_amazon_links(content, phrase_index, max_links=slots)
    if new_content != content:
        post.content = new_content
        return True
    return False


def add_links_to_post(
    post: fm.Post,
    path: Path,
    phrase_index: List[Tuple[str, str, str]],
    max_links: int,
    validation_report: Optional[Dict[str, Any]] = None,
) -> bool:
    """Add internal links to post content. Returns True if changed.
    If validation_report is provided and post is flagged link_distribution_skewed, uses distribution-aware linking."""
    slug = post.get("slug") or path.stem
    original = post.content or ""
    # Strip links from H1 first (avoid links in title)
    content = strip_links_from_h1(original)
    # Strip all internal links so we can re-add with 1-per-paragraph distribution
    content = strip_internal_links(content)
    existing_count = len(re.findall(r"\]\s*\(\s*" + re.escape(SITE_BASE_URL) + r"/blog/", content))
    if existing_count >= max_links:
        if content != original:
            post.content = content
            return True
        return False
    slots = max(0, max_links - existing_count)
    post_info = (validation_report or {}).get("posts", {}).get(slug, {})
    distribution_aware = post_info.get("link_distribution_skewed", False)
    if distribution_aware:
        log.debug("Using distribution-aware linking for %s", slug)
    new_content = insert_internal_links(
        content,
        phrase_index,
        exclude_slug=slug,
        max_links=slots,
        distribution_aware=distribution_aware,
    )
    if new_content != original:
        post.content = new_content
        return True
    return False


def _collect_images_for_inline(post: fm.Post) -> List[Tuple[str, str, Optional[str]]]:
    """Collect (url, alt, amazon_url?) for inline insertion. Prefer Amazon product images.
    Excludes cover image when we have alternatives, so we don't repeat the header inline."""
    result: List[Tuple[str, str, Optional[str]]] = []
    cover_url = (post.get("coverImage") or "").strip()
    products = post.get("amazonProducts") or []
    for p in products[:5]:
        url = p.get("imageUrl") or ""
        if url:
            title = p.get("title") or p.get("query") or "Product"
            aff = p.get("affiliateUrl") or p.get("url") or ""
            result.append((url, title, aff if aff and "amazon" in aff.lower() else None))
    images = post.get("images") or []
    for url in images:
        if url and not any(r[0] == url for r in result):
            result.append((url, "Related", None))
    # Prefer diverse images: put cover last so we use others first when inserting
    if cover_url and len(result) > 1:
        result = [r for r in result if r[0] != cover_url] + [r for r in result if r[0] == cover_url]
    return result


def _strip_trailing_cover_image(content: str, cover_url: str) -> str:
    """Remove trailing image block when it matches the cover (AI sometimes adds it at the end)."""
    if not content or not cover_url:
        return content
    # Match [![alt](url)](affiliate) or ![alt](url) at end of content
    pattern = re.compile(
        r"\n*\n\[?\!\[[^\]]*\]\s*\(\s*" + re.escape(cover_url) + r"\s*\)(?:\s*\]\s*\([^)]*\))?\s*$",
        re.IGNORECASE,
    )
    return pattern.sub("", content).rstrip()


def insert_inline_images(content: str, images: List[Tuple[str, str, Optional[str]]], max_images: int = 3) -> str:
    """
    Insert inline images after every 2nd H2/H3. Target ~3 images per article.
    Images: (url, alt, amazon_url?). If amazon_url, wrap in link.
    """
    if not images:
        return content
    lines = content.split("\n")
    result: List[str] = []
    section_count = 0
    inserted = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^##?\s+", line):
            section_count += 1
            result.append(line)
            if section_count % 2 == 0 and inserted < max_images:
                j = i + 1
                while j < len(lines) and not re.match(r"^##?\s+", lines[j]) and not re.match(r"^!\[", lines[j]):
                    result.append(lines[j])
                    j += 1
                block_after = "\n".join(lines[i + 1 : j])
                if "![" in block_after or "<img" in block_after.lower():
                    i = j - 1
                else:
                    img = images[inserted % len(images)]
                    url, alt, amazon_url = img[0], img[1], img[2] if len(img) > 2 else None
                    if amazon_url:
                        block = f"\n\n[![{alt}]({url})]({amazon_url})\n\n"
                    else:
                        block = f"\n\n![{alt}]({url})\n\n"
                    result.append(block)
                    inserted += 1
                    i = j - 1
        else:
            result.append(line)
        i += 1
    return "\n".join(result)


def add_inline_images_to_post(post: fm.Post) -> bool:
    """Insert inline images after every 2nd H2/H3. Returns True if changed."""
    content = post.content or ""
    cover_url = (post.get("coverImage") or "").strip()
    # Strip trailing duplicate cover image (AI sometimes adds it at the end)
    content = _strip_trailing_cover_image(content, cover_url)

    images = _collect_images_for_inline(post)
    if not images:
        if content != (post.content or ""):
            post.content = content
            return True
        return False
    new_content = insert_inline_images(content, images, max_images=3)
    if new_content != (post.content or ""):
        post.content = new_content
        return True
    return False


def insert_featured_product(content: str, product: Dict[str, Any]) -> str:
    """
    Insert featured product block after 1st H2 (high in article, not near bottom).
    Format: <!-- featured-product: TITLE | PRICE | IMAGE_URL | AFFILIATE_URL -->
    If no H2, insert after 1st H1. Remove any existing featured-product and re-insert.
    """
    if not product:
        return content
    title = (product.get("title") or product.get("query") or product.get("name") or "Product").replace("|", "-")
    price = (product.get("price") or "").replace("|", "-")
    image_url = product.get("imageUrl") or ""
    aff_url = product.get("affiliateUrl") or product.get("url") or ""
    if not aff_url:
        return content
    block = f"\n\n<!-- featured-product: {title} | {price} | {image_url} | {aff_url} -->\n\n"
    # Remove any existing featured-product comment (so we can re-insert at correct position)
    content = re.sub(r"\n*<!--\s*featured-product:[^>]*-->\n*", "\n\n", content)
    lines = content.split("\n")
    result: List[str] = []
    i = 0
    inserted = False
    # Priority: after 1st H2. Fallback: after 1st H1 + intro. Fallback: after first paragraph.
    while i < len(lines):
        line = lines[i]
        if re.match(r"^##\s+", line):
            result.append(line)
            if not inserted:
                j = i + 1
                while j < len(lines) and not re.match(r"^##\s+", lines[j]):
                    result.append(lines[j])
                    j += 1
                result.append(block)
                inserted = True
                i = j - 1
        elif re.match(r"^#\s+", line) and not re.match(r"^##", line):
            result.append(line)
            if not inserted:
                j = i + 1
                while j < len(lines) and not re.match(r"^#+\s+", lines[j]):
                    result.append(lines[j])
                    j += 1
                result.append(block)
                inserted = True
                i = j - 1
        else:
            result.append(line)
        i += 1
    if not inserted:
        result = []
        i = 0
        while i < len(lines):
            result.append(lines[i])
            if lines[i].strip() and len(lines[i]) > 40 and not inserted:
                result.append(block)
                inserted = True
            i += 1
    return "\n".join(result) if inserted else content


def add_featured_product_to_post(post: fm.Post) -> bool:
    """Insert featured product callout after 3rd H2. Returns True if changed."""
    products = post.get("amazonProducts") or []
    if not products:
        return False
    content = post.content or ""
    new_content = insert_featured_product(content, products[0])
    if new_content != content:
        post.content = new_content
        return True
    return False


def fix_amazon_images(post: fm.Post) -> bool:
    """Populate empty imageUrl for amazonProducts. Returns True if any changed."""
    products = post.get("amazonProducts") or []
    if not products:
        return False
    from amazon_linker import ensure_product_image
    changed = False
    for i, p in enumerate(products):
        if not p.get("imageUrl"):
            products[i] = ensure_product_image(p)
            if products[i].get("imageUrl"):
                changed = True
            if i < len(products) - 1:
                time.sleep(1)  # Rate limit
    if changed:
        post["amazonProducts"] = products
    return changed


def backfill_cover_images(post: fm.Post, path: Path, dry_run: bool, fix_list: Optional[Dict[str, Any]] = None) -> bool:
    """Re-fetch cover images for a post using topic-aware image_fetcher. If fix_list has image_search_queries for this slug, use them so we search for topic-relevant images instead of fallbacks."""
    slug = post.get("slug") or path.stem
    draft = {"frontmatter": dict(post.metadata), "content": post.content or ""}
    if fix_list and fix_list.get("posts") and slug in fix_list["posts"]:
        queries = (fix_list["posts"][slug] or {}).get("image_search_queries")
        if queries:
            draft["image_search_queries"] = queries
            log.debug("Using fix-list image_search_queries for %s: %s", slug, queries[:2])
    from image_fetcher import fetch_images
    result = fetch_images(draft, use_pexels=True)
    new_cover = result.get("frontmatter", {}).get("coverImage", "")
    new_images = result.get("frontmatter", {}).get("images", [])
    old_cover = post.get("coverImage", "")
    old_images = post.get("images", [])
    if new_cover != old_cover or new_images != old_images:
        if not dry_run:
            post["coverImage"] = new_cover
            post["images"] = new_images
        return True
    return False


def run_backfill(
    tags: bool = True,
    links: bool = True,
    amazon_links: bool = True,
    fix_amazon_images_flag: bool = False,
    inline_images: bool = True,
    images_only: bool = False,
    max_links: int = 5,
    max_amazon_links: int = 5,
    dry_run: bool = False,
) -> Tuple[int, int, int, int, int]:
    """Run backfill. Returns (tags_fixed, links_added, amazon_links_added, images_fixed, inline_images_added)."""
    posts = load_posts()
    if not posts:
        log.warning("No posts found")
        return 0, 0, 0, 0, 0

    tags_fixed = 0
    links_added = 0
    amazon_links_added = 0
    images_fixed = 0
    cover_images_updated = 0
    excerpts_fixed = 0
    mismatches_fixed = 0

    if images_only:
        fix_list = load_fix_list()
        if not fix_list or not fix_list.get("posts"):
            log.warning(
                "fix-list.json missing or empty. Run generate_fix_list.py first for topic-relevant images. "
                "Proceeding with title-based search only — images may be generic or repeated."
            )
        elif fix_list.get("posts"):
            log.info("Using fix list for image search terms (%d posts)", len(fix_list["posts"]))
        for path, post in posts:
            if backfill_cover_images(post, path, dry_run, fix_list):
                cover_images_updated += 1
                if not dry_run:
                    fm.dump(post, path)
                log.info("Updated cover images: %s", path.name)
        if cover_images_updated and not dry_run:
            from publisher import rebuild_blog_json
            rebuild_blog_json(config.git.repo_path)
        return 0, 0, 0, 0, cover_images_updated

    if fix_amazon_images_flag:
        for path, post in posts:
            if fix_amazon_images(post):
                images_fixed += 1
                if not dry_run:
                    fm.dump(post, path)
                log.info("Fixed Amazon images: %s", path.name)

    for path, post in posts:
        if fix_mismatched_excerpt(post):
            mismatches_fixed += 1
            if not dry_run:
                fm.dump(post, path)
            log.info("Fixed mismatched excerpt: %s", path.name)

    for path, post in posts:
        if fix_placeholder_excerpt(post):
            excerpts_fixed += 1
            if not dry_run:
                fm.dump(post, path)
            log.info("Fixed placeholder excerpt: %s", path.name)

    if tags:
        for path, post in posts:
            if fix_tags(post):
                tags_fixed += 1
                if not dry_run:
                    fm.dump(post, path)
                log.info("Fixed tags: %s", path.name)

    if links and len(posts) > 1:
        validation_report = load_validation_report()
        if validation_report.get("posts"):
            log.info("Using validation report for distribution-aware linking (%d posts)", len(validation_report["posts"]))
        phrase_index = build_phrase_index(posts)
        for path, post in posts:
            if add_links_to_post(post, path, phrase_index, max_links, validation_report):
                links_added += 1
                if not dry_run:
                    fm.dump(post, path)
                log.info("Added links: %s", path.name)

    if amazon_links:
        for path, post in posts:
            if add_amazon_links_to_post(post, path, max_links=max_amazon_links):
                amazon_links_added += 1
                if not dry_run:
                    fm.dump(post, path)
                log.info("Added Amazon links: %s", path.name)

    inline_images_added = 0
    featured_products_added = 0
    if inline_images:
        for path, post in posts:
            changed = False
            if add_inline_images_to_post(post):
                inline_images_added += 1
                changed = True
            if add_featured_product_to_post(post):
                featured_products_added += 1
                changed = True
            if changed and not dry_run:
                fm.dump(post, path)
            if changed:
                log.info("Added inline images/featured product: %s", path.name)

    if (tags_fixed or links_added or amazon_links_added or images_fixed or inline_images_added or featured_products_added or excerpts_fixed or mismatches_fixed) and not dry_run:
        from publisher import rebuild_blog_json
        rebuild_blog_json(config.git.repo_path)

    return tags_fixed, links_added, amazon_links_added, images_fixed, inline_images_added + featured_products_added


def main():
    parser = argparse.ArgumentParser(description="Backfill tags, internal links, and Amazon affiliate links (deterministic, zero AI)")
    parser.add_argument("--tags-only", action="store_true", help="Only fix empty tags")
    parser.add_argument("--links-only", action="store_true", help="Internal + Amazon links")
    parser.add_argument("--amazon-links-only", action="store_true", help="Only add Amazon links")
    parser.add_argument("--no-amazon-links", action="store_true", help="Skip Amazon links (internal only)")
    parser.add_argument("--fix-amazon-images", action="store_true", help="Populate empty product imageUrl from Amazon")
    parser.add_argument("--inline-images", action="store_true", help="Insert inline images after every 2nd H2")
    parser.add_argument("--no-inline-images", action="store_true", help="Skip inline images during backfill")
    parser.add_argument("--inline-images-only", action="store_true", help="Only add inline images")
    parser.add_argument("--images-only", action="store_true", help="Re-fetch cover images (topic-aware, 7-day exclusion)")
    parser.add_argument("--require-fix-list", action="store_true", help="With --images-only: exit with error if fix-list.json missing (run generate_fix_list.py first)")
    parser.add_argument("--max-links", type=int, default=5, help="Max internal links per post (default: 5)")
    parser.add_argument("--max-amazon-links", type=int, default=5, help="Max Amazon links per post (default: 5)")
    parser.add_argument("--dry-run", action="store_true", help="Log changes, don't write files")
    args = parser.parse_args()

    do_tags = args.tags_only or (not args.links_only and not args.amazon_links_only and not args.fix_amazon_images and not args.inline_images_only and not args.images_only)
    do_links = (args.links_only or (not args.tags_only and not args.amazon_links_only and not args.fix_amazon_images and not args.inline_images_only and not args.images_only)) and not args.amazon_links_only
    do_amazon = (args.links_only or args.amazon_links_only or (not args.tags_only and not args.no_amazon_links and not args.fix_amazon_images and not args.inline_images_only and not args.images_only)) and not args.no_amazon_links
    do_inline_images = (args.inline_images or args.inline_images_only or (do_tags or do_links or do_amazon)) and not args.no_inline_images

    if args.images_only:
        do_tags = False
        do_links = False
        do_amazon = False
        do_inline_images = False
        if args.require_fix_list:
            fl = load_fix_list()
            if not fl or not fl.get("posts"):
                log.error(
                    "fix-list.json missing or empty and --require-fix-list set. "
                    "Run: python bot/generate_fix_list.py  then  python bot/backfill_content.py --images-only"
                )
                sys.exit(1)
    elif args.amazon_links_only:
        do_tags = False
        do_links = False
        do_amazon = True
    elif args.fix_amazon_images:
        do_tags = False
        do_links = False
        do_amazon = False
    elif args.inline_images_only:
        do_tags = False
        do_links = False
        do_amazon = False
        do_inline_images = True

    log.info(
        "Backfill: tags=%s links=%s amazon=%s fix_images=%s inline_images=%s max_links=%d max_amazon=%d dry_run=%s",
        do_tags, do_links, do_amazon, args.fix_amazon_images, do_inline_images, args.max_links, args.max_amazon_links, args.dry_run,
    )
    tags_fixed, links_added, amazon_added, images_fixed, inline_added = run_backfill(
        tags=do_tags,
        links=do_links,
        amazon_links=do_amazon,
        fix_amazon_images_flag=args.fix_amazon_images,
        inline_images=do_inline_images,
        images_only=args.images_only,
        max_links=args.max_links,
        max_amazon_links=args.max_amazon_links,
        dry_run=args.dry_run,
    )
    if args.images_only:
        log.info("Done. Cover images updated: %d", inline_added)
    else:
        log.info("Done. Tags fixed: %d, links added: %d, Amazon links added: %d, images fixed: %d, inline images added: %d", tags_fixed, links_added, amazon_added, images_fixed, inline_added)
    sys.exit(0)


if __name__ == "__main__":
    main()
