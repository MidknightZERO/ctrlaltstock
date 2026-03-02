"""
fix_damaged_posts.py — Deterministic fix for posts damaged by repair_content or containing meta sections.

Detects and fixes (no AI):
- Meta sections: # SEO Optimization, # Key Takeaways, # Internal Links for Further Reading, # Summary
- Paragraph containing "This expanded version exceeds the 900-word mark"
- Truncated markdown link at end of content

Spanish posts: listed for manual review only (no AI translation in this script).

Usage:
    python bot/fix_damaged_posts.py              # Report only, write bot/.tmp/posts-to-fix.json
    python bot/fix_damaged_posts.py --fix        # Apply deterministic fixes and save
    python bot/fix_damaged_posts.py --dry-run    # Show what would be fixed, no writes
"""

import argparse
import json
import re
import sys
from pathlib import Path

import frontmatter as fm

import config

_BOT_DIR = Path(__file__).parent
sys.path.insert(0, str(_BOT_DIR))

from utils import (
    META_SECTION_HEADINGS,
    detect_content_issues,
    fix_truncated_link_deterministic,
    strip_meta_sections_by_heading,
    strip_ai_meta_commentary,
)


def get_posts_dir() -> Path:
    return Path(config.git.repo_path) / config.bot.posts_dir


def detect_meta_sections(content: str) -> bool:
    """True if content contains known meta section headings or the 900-word paragraph."""
    if not content or not content.strip():
        return False
    text = content.strip().lower()
    for h in META_SECTION_HEADINGS:
        if f"# {h}" in text or f"## {h}" in text:
            return True
    if "this expanded version exceeds the 900-word mark" in text:
        return True
    if "strategic keyword usage" in text and "seo" in text:
        return True
    return False


def detect_spanish(content: str, title: str = "") -> bool:
    """Heuristic: True if content or title contains common Spanish words/phrases."""
    spanish_signals = (
        " el ", " la ", " los ", " las ", " un ", " una ", " de ", " en ", " y ", " es ", " por ", " para ",
        " con ", " que ", " del ", " al ", " se ", " más ", " como ", " pero ", " sus ", " este ", " esta ",
        " también ", " cuando ", " después ", " mientras ", " durante ", " aunque ", " porque ", " entonces ",
        "velocidad", "tiempos", "carga", "comunidad", "reacciones", "división", "opiniones",
        "hallazgos", "usuarios", "votos", "positivos", "comentarios", "haciendo", "eco",
    )
    combined = f"{title} {content}".lower()
    count = sum(1 for s in spanish_signals if s in combined)
    return count >= 3


def apply_deterministic_fixes(content: str) -> str:
    """Apply strip meta sections, strip meta commentary, fix truncated link. No AI."""
    if not content or not content.strip():
        return content
    text = content.strip()
    text = strip_meta_sections_by_heading(text)
    text = strip_ai_meta_commentary(text)
    text = fix_truncated_link_deterministic(text)
    return text.strip()


def scan_post(path: Path) -> dict:
    """Scan one post; return {slug, meta_sections, truncated_link, spanish, content_preview}."""
    post = fm.load(path)
    content = post.content or ""
    title = (post.get("title") or path.stem).strip()
    slug = path.stem

    issues = detect_content_issues(content)
    meta = detect_meta_sections(content)
    spanish = detect_spanish(content, title)

    return {
        "slug": slug,
        "path": str(path),
        "meta_sections": meta,
        "truncated_link": issues.get("truncated_link", False),
        "spanish": spanish,
        "needs_fix": meta or issues.get("truncated_link", False),
    }


def fix_post(path: Path, dry_run: bool = False) -> bool:
    """Apply deterministic fixes to one post. Returns True if content was changed and saved."""
    post = fm.load(path)
    content = post.content or ""
    fixed = apply_deterministic_fixes(content)
    if fixed == content:
        return False
    if not dry_run:
        post.content = fixed
        fm.dump(post, path)
    return True


def main():
    parser = argparse.ArgumentParser(description="Detect and fix damaged posts (meta sections, truncated links)")
    parser.add_argument("--fix", action="store_true", help="Apply deterministic fixes and save")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fixed, no writes")
    args = parser.parse_args()

    posts_dir = get_posts_dir()
    if not posts_dir.exists():
        print(f"Posts dir not found: {posts_dir}", file=sys.stderr)
        sys.exit(1)

    report = {"posts": [], "summary": {"total": 0, "meta_sections": 0, "truncated_link": 0, "spanish": 0, "needs_fix": 0}}

    for path in sorted(posts_dir.glob("*.md")):
        result = scan_post(path)
        report["posts"].append(result)
        report["summary"]["total"] += 1
        if result["meta_sections"]:
            report["summary"]["meta_sections"] += 1
        if result["truncated_link"]:
            report["summary"]["truncated_link"] += 1
        if result["spanish"]:
            report["summary"]["spanish"] += 1
        if result["needs_fix"]:
            report["summary"]["needs_fix"] += 1

    out_dir = _BOT_DIR / ".tmp"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "posts-to-fix.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Report written to {report_path}")
    print(f"Summary: {report['summary']['needs_fix']} posts need fix (meta: {report['summary']['meta_sections']}, truncated: {report['summary']['truncated_link']})")
    print(f"Spanish (manual review): {report['summary']['spanish']} posts")

    if args.fix or args.dry_run:
        fixed_count = 0
        for r in report["posts"]:
            if not r["needs_fix"]:
                continue
            path = Path(r["path"])
            if fix_post(path, dry_run=args.dry_run):
                fixed_count += 1
                print(f"{'[DRY RUN] Would fix' if args.dry_run else 'Fixed'}: {r['slug']}")
        print(f"{'Would fix' if args.dry_run else 'Fixed'} {fixed_count} post(s)")

    sys.exit(0)


if __name__ == "__main__":
    main()
