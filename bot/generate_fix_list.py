"""
generate_fix_list.py — Build a fix list for existing posts using AI.

One (or few) batched API call(s): send the full list of posts that need fixes,
get back image_search_queries for all of them in one response. Writes
bot/.tmp/fix-list.json for backfill_content.py --images-only.

Usage:
    python bot/generate_fix_list.py              # Generate fix list (batched AI call)
    python bot/generate_fix_list.py --dry-run    # Show payload size, no AI
"""

import json
import re
import sys
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path

import frontmatter as fm

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

Path(config.bot.logs_dir).mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [generate_fix_list] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

FIX_LIST_DIR = _BOT_DIR / ".tmp"
FIX_LIST_PATH = FIX_LIST_DIR / "fix-list.json"

# Max posts per API call to stay under context and get reliable JSON back
POSTS_PER_CALL = int(getattr(config.bot, "fix_list_batch_size", 25))

SYSTEM_PROMPT = """You output only valid JSON. No markdown code fences, no explanation.

You will receive a list of blog posts (slug, title, excerpt). For each post, produce 2–4 short image search phrases (2–5 words each) that would find relevant stock photos for that article. Use concrete product/topic terms, e.g. "Nintendo Switch game", "AMD graphics card", "gaming headset", "PS5 console". Match the article topic, not generic tech.

Return a single JSON object with one key "posts": an object mapping each slug to an object with one key "image_search_queries" (array of strings). Example:
{"posts": {"my-post-slug": {"image_search_queries": ["phrase one", "phrase two"]}, "another-slug": {"image_search_queries": ["a", "b", "c"]}}}"""


def load_posts():
    """Load all markdown posts from posts_dir. Returns [(path, post), ...]."""
    posts_dir = Path(config.git.repo_path) / config.bot.posts_dir
    if not posts_dir.exists():
        return []
    result = []
    for p in sorted(posts_dir.glob("*.md")):
        try:
            post = fm.load(p)
            result.append((p, post))
        except Exception as e:
            log.warning("Could not load %s: %s", p.name, e)
    return result


def build_batch_payload(posts_chunk):
    """Build one user prompt for a chunk of posts: slug, title, excerpt (compact)."""
    lines = []
    for path, post in posts_chunk:
        slug = post.get("slug") or path.stem
        title = (post.get("title") or "")[:200]
        excerpt = (post.get("excerpt") or "").strip()[:280]
        if not excerpt:
            excerpt = ((post.content or "").strip()[:280] or "(no excerpt)").replace("\n", " ")
        lines.append(f"- slug: {slug}\n  title: {title}\n  excerpt: {excerpt}")
    return "Posts:\n" + "\n".join(lines) + "\n\nReturn JSON with key \"posts\" mapping each slug to {\"image_search_queries\": [\"...\", ...]}."


def extract_json_from_response(raw: str) -> dict:
    """Parse JSON from model response; handle ```json ... ``` wrapper."""
    if not raw or not raw.strip():
        return {}
    text = raw.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        brace = text.find("{")
        if brace >= 0:
            try:
                return json.loads(text[brace:])
            except json.JSONDecodeError:
                pass
    return {}


def run(dry_run: bool = False) -> dict:
    """
    Build fix list in one or few batched API calls: send all posts (or chunks),
    get back image_search_queries for every post in one response per chunk.
    """
    posts = load_posts()
    if not posts:
        log.warning("No posts found")
        return {"posts": {}, "generated_at": datetime.now(timezone.utc).isoformat()}

    fix_list = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "posts": {},
    }

    if dry_run:
        for path, post in posts:
            slug = post.get("slug") or path.stem
            fix_list["posts"][slug] = {"image_search_queries": ["[dry-run]"]}
        log.info("Dry run: would batch %d posts into %d API call(s)", len(posts), (len(posts) + POSTS_PER_CALL - 1) // POSTS_PER_CALL)
        return fix_list

    num_calls = (len(posts) + POSTS_PER_CALL - 1) // POSTS_PER_CALL
    log.info("Batching %d posts into %d API call(s) (max %d posts per call)", len(posts), num_calls, POSTS_PER_CALL)

    from ai_writer import call_ai

    for chunk_start in range(0, len(posts), POSTS_PER_CALL):
        chunk = posts[chunk_start : chunk_start + POSTS_PER_CALL]
        chunk_num = chunk_start // POSTS_PER_CALL + 1
        log.info("API call %d/%d: %d posts", chunk_num, num_calls, len(chunk))
        prompt = build_batch_payload(chunk)
        try:
            raw = call_ai(prompt, system=SYSTEM_PROMPT)
            data = extract_json_from_response(raw)
            posts_data = data.get("posts") or {}
            for path, post in chunk:
                slug = post.get("slug") or path.stem
                entry = posts_data.get(slug) or {}
                queries = entry.get("image_search_queries") or []
                if isinstance(queries, list):
                    queries = [str(q).strip() for q in queries if str(q).strip()][:4]
                if not queries:
                    title = (post.get("title") or "")[:50]
                    queries = [title]
                fix_list["posts"][slug] = {"image_search_queries": queries}
        except Exception as e:
            log.error("Batch %d failed: %s — using title fallback for chunk", chunk_num, e)
            for path, post in chunk:
                slug = post.get("slug") or path.stem
                title = (post.get("title") or "")[:50]
                fix_list["posts"][slug] = {"image_search_queries": [title]}

    FIX_LIST_DIR.mkdir(parents=True, exist_ok=True)
    FIX_LIST_PATH.write_text(json.dumps(fix_list, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("Wrote fix list to %s (%d posts)", FIX_LIST_PATH, len(fix_list["posts"]))

    return fix_list


def main():
    parser = argparse.ArgumentParser(description="Generate fix list (batched AI image search terms) for run-fix-existing")
    parser.add_argument("--dry-run", action="store_true", help="Do not call AI; show batch count and write placeholder")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
