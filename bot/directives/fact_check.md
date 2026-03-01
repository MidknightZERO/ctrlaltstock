---
directive: fact_check
description: Validate key factual claims from AI-generated articles using DuckDuckGo
---

# Fact-Check Directive

## Goal
After the AI writes an article, validate a few key factual claims against DuckDuckGo Instant Answer API. Flag potential contradictions for human review. Does not block publish.

## Tools
- `bot/fact_check.py` — claim extraction and DDG queries

## Inputs
- Draft dict (from ai_writer / ai_editor) with `content` and `frontmatter.title`
- Or explicit claims via `--claims "claim1" "claim2"`

## Process
1. Extract 3–5 candidate claims from draft content (sentences with dates, product names, numbers)
2. For each claim, query `https://api.duckduckgo.com/?q=<claim>&format=json&no_html=1`
3. Compare DDG abstract/related topics to the claim (keyword overlap, contradiction signals)
4. Output verdict per claim: `supported`, `contradicted`, or `unclear`
5. Log results; if any `contradicted`, optionally append note to draft for review

## Output
List of `{ claim, verdict, source }` dicts. Written to `.tmp` or logged. Pipeline continues regardless.

## Edge Cases
- **No claims extracted**: Skip DDG calls, return empty list
- **DDG rate limits**: Undocumented; we use 1.5s delay between queries, max 5 claims
- **DDG returns empty**: Verdict `unclear`
- **Draft not in expected format**: Log warning, return empty

## Integration
Run after `ai_editor` in the pipeline. Results are logged; publish is not blocked. Future: surface contradicted claims in a review UI or Discord notification.
