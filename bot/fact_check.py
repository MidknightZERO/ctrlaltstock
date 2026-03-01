"""
fact_check.py — Validates key factual claims from AI-generated articles using DuckDuckGo.

Extracts candidate claims from draft content, queries DuckDuckGo Instant Answer API,
and compares results to flag potential contradictions. No API key required.

Usage:
    python fact_check.py --draft path/to/draft.json
    python fact_check.py --claims "RTX 5090 launches March 2025" "AMD announced Ryzen 9000"
"""

import argparse
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [fact_check] %(levelname)s %(message)s")

DDG_BASE = "https://api.duckduckgo.com"
MAX_CLAIMS = 5
RATE_DELAY_SEC = 1.5  # Be conservative with DDG; no documented limit


def extract_claims(content: str, title: str = "", max_claims: int = MAX_CLAIMS) -> List[str]:
    """
    Extract candidate factual claims from article content using heuristics.
    Looks for sentences with product names, dates, numbers, or specific assertions.
    """
    # Combine title and content for context
    text = f"{title}\n\n{content}" if title else content
    sentences = re.split(r"[.!?]\s+", text)
    claims = []
    seen = set()

    # Patterns that suggest factual claims
    date_pattern = re.compile(r"\b(20\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+20\d{2}\b")
    product_pattern = re.compile(r"\b(RTX|RX|GTX|Ryzen|Core i\d|RTX \d{4}|RX \d{4}|PS5|Xbox|Nintendo|Steam Deck)\b", re.I)
    number_claim = re.compile(r"\b(?:£|\\$|€)\s*[\d,]+|\b\d+\s*(?:GB|TB|MHz|GHz|W)\b")

    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 20 or len(sent) > 200:
            continue
        # Skip questions, opinions, CTAs
        if sent.startswith(("Join ", "Sign up", "Subscribe", "Click ", "Visit ")):
            continue
        if "?" in sent or sent.lower().startswith("if you"):
            continue
        norm = sent.lower()[:80]
        if norm in seen:
            continue
        if date_pattern.search(sent) or product_pattern.search(sent) or number_claim.search(sent):
            seen.add(norm)
            claims.append(sent)
            if len(claims) >= max_claims:
                break
    return claims


def query_duckduckgo(query: str) -> Dict[str, Any]:
    """Query DuckDuckGo Instant Answer API. Returns abstract, related topics, etc."""
    try:
        resp = httpx.get(
            DDG_BASE,
            params={"q": query, "format": "json", "no_html": "1"},
            timeout=10,
            headers={"User-Agent": "CtrlAltStockBot/1.0 (compatible; fact-check)"},
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log.warning("DDG query failed for %s: %s", query[:40], e)
        return {}


def compare_claim_to_ddg(claim: str, ddg_data: Dict[str, Any]) -> str:
    """
    Compare a claim to DuckDuckGo response. Returns 'supported', 'contradicted', or 'unclear'.
    """
    abstract = (ddg_data.get("Abstract") or ddg_data.get("AbstractText") or "").strip()
    related = ddg_data.get("RelatedTopics") or []
    related_text = " ".join(
        r.get("Text", "") if isinstance(r, dict) else str(r)
        for r in related[:5]
    )

    combined = f"{abstract} {related_text}".lower()
    claim_lower = claim.lower()

    if not combined:
        return "unclear"

    # Simple heuristic: if DDG abstract contains key terms from the claim
    claim_words = set(re.findall(r"\b[a-z0-9]{3,}\b", claim_lower))
    claim_words -= {"the", "and", "for", "with", "this", "that", "from", "have", "has", "been"}
    if not claim_words:
        return "unclear"

    overlap = sum(1 for w in claim_words if w in combined)
    if overlap >= len(claim_words) * 0.5:
        return "supported"
    elif "not" in combined or "incorrect" in combined or "false" in combined:
        return "contradicted"
    return "unclear"


def fact_check_claims(claims: List[str]) -> List[Dict[str, Any]]:
    """For each claim, query DDG and return verdict."""
    results = []
    for i, claim in enumerate(claims):
        if i > 0:
            time.sleep(RATE_DELAY_SEC)
        ddg = query_duckduckgo(claim[:200])
        verdict = compare_claim_to_ddg(claim, ddg)
        results.append({
            "claim": claim,
            "verdict": verdict,
            "source": ddg.get("AbstractURL", "") or ddg.get("Abstract", "")[:200],
        })
    return results


def fact_check_draft(draft: Dict[str, Any], max_claims: int = MAX_CLAIMS) -> List[Dict[str, Any]]:
    """Extract claims from draft and fact-check them."""
    content = draft.get("content", "") or ""
    frontmatter = draft.get("frontmatter", {})
    title = frontmatter.get("title", "") or draft.get("title", "")

    claims = extract_claims(content, title, max_claims=max_claims)
    if not claims:
        log.info("No claims extracted from draft")
        return []

    log.info("Fact-checking %d claims", len(claims))
    return fact_check_claims(claims)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fact-check draft claims via DuckDuckGo")
    parser.add_argument("--draft", help="Path to draft JSON file")
    parser.add_argument("--claims", nargs="+", help="Explicit claims to check")
    parser.add_argument("--max-claims", type=int, default=MAX_CLAIMS, help="Max claims to extract")
    parser.add_argument("--json", action="store_true", help="Output JSON only")
    args = parser.parse_args()

    if args.claims:
        results = fact_check_claims(args.claims)
    elif args.draft:
        path = Path(args.draft)
        if not path.exists():
            log.error("Draft file not found: %s", path)
            return 1
        draft = json.loads(path.read_text(encoding="utf-8"))
        results = fact_check_draft(draft, max_claims=args.max_claims)
    else:
        parser.error("Provide --draft or --claims")

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            log.info("[%s] %s", r["verdict"], r["claim"][:60])
        print(json.dumps(results, indent=2))

    contradicted = sum(1 for r in results if r["verdict"] == "contradicted")
    return 1 if contradicted > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
