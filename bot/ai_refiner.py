"""
ai_refiner.py — Refines a draft article after the initial writer pass.

Adds relevant, accurate information on the topic without changing structure or brand voice.
Runs after the writer and before the editor in the pipeline.

Usage:
    python ai_refiner.py   # reads draft JSON from stdin, writes refined JSON to stdout
"""

import json
import sys
import logging
import logging.handlers
from typing import Dict, Any
from pathlib import Path

import config
from ai_writer import call_ai

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            Path(config.bot.logs_dir) / "ai_refiner.log",
            encoding="utf-8", maxBytes=10_000_000, backupCount=3
        ),
    ],
)
log = logging.getLogger(__name__)


TARGET_WORDS = 900  # Refiner should expand to at least this if draft is short

REFINER_SYSTEM_PROMPT = """You are a fact-checker and content refiner for CtrlAltStock, a UK tech hardware blog.

Your job is to refine the draft article so it contains as much relevant, accurate information about the topic as possible.

Rules:
- Keep the same structure (headings, sections, order). Do not remove or reorder sections.
- **Word count:** If the draft is below 900 words, you MUST expand it to at least 900 words. Add relevant detail: more examples, concrete product names and prices in £, technical specifics, or extra sub-points. Do not pad with fluff or repetition—every addition must be useful and accurate.
- Add concrete details where the draft is vague: product names, model numbers, price ranges in GBP (£) only, dates, or technical specifics where you can state them accurately.
- All prices must be in pounds sterling (£). Our audience is UK; do not use USD.
- Do not invent or speculate. Only add information that is clearly relevant to the topic and that you can state accurately. If in doubt, leave the sentence as is.
- Keep UK English and the same brand voice (conversational, practical, community-focused).
- Do not add a new introduction or conclusion; only enrich and expand the existing content.
- Return ONLY the refined article markdown. No commentary, no JSON, no "Here is the refined article" — just the article text."""


MIN_CONTENT_WORDS = 100  # Refiner must not run on tiny drafts (would pad crap)
MIN_REFINED_WORDS = 800  # Refiner output below this is considered bad (weak LLM)
MIN_REFINED_RATIO = 0.8  # Refiner must not shorten below 80% of input
MAX_REFINER_ATTEMPTS = 3


def refine_article(draft: Dict[str, Any]) -> Dict[str, Any]:
    """
    Refine the draft's content with more relevant information.
    Retries up to MAX_REFINER_ATTEMPTS; on retry feeds previous output back and asks to expand.
    Returns the draft with an updated 'content' field.
    Raises ValueError if input is too short or all attempts fail.
    """
    content_to_refine = draft.get("content", "") or ""
    input_word_count = len(content_to_refine.split())
    if input_word_count < MIN_CONTENT_WORDS:
        raise ValueError(
            "Refiner cannot run on insufficient content (%d words). Minimum %d. Aborting to avoid padding."
            % (input_word_count, MIN_CONTENT_WORDS)
        )
    title = draft.get("frontmatter", {}).get("title", "this article")

    last_error = None
    for attempt in range(1, MAX_REFINER_ATTEMPTS + 1):
        log.info("Refining article: %s (attempt %d/%d)", title, attempt, MAX_REFINER_ATTEMPTS)
        current_word_count = len(content_to_refine.split())
        retry_note = ""
        if attempt > 1:
            retry_note = "IMPORTANT: Your previous attempt was too short. Expand the article below to at least 900 words while preserving structure and voice. Do not remove or condense anything.\n\n"
        prompt = f"""Refine this draft so it includes as much relevant, accurate information about the topic as possible. Keep the same structure and voice.
{retry_note}ARTICLE TITLE: {title}
CURRENT LENGTH: {current_word_count} words. TARGET: at least {TARGET_WORDS} words.

If the draft is below {TARGET_WORDS} words, expand it to at least {TARGET_WORDS} words by adding relevant detail (examples, product names, £ prices, technical points). No fluff or repetition.

DRAFT:
---
{content_to_refine}
---

Return ONLY the refined article markdown. Nothing else."""

        refined = call_ai(prompt, system=REFINER_SYSTEM_PROMPT)
        refined = refined.strip()
        refined_words = len(refined.split())
        if refined_words >= MIN_REFINED_WORDS and refined_words >= input_word_count * MIN_REFINED_RATIO:
            result = dict(draft)
            result["content"] = refined
            return result
        last_error = ValueError(
            "Refiner returned too-short content (%d words, input was %d). Need >=%d words and >=%.0f%% of input."
            % (refined_words, input_word_count, MIN_REFINED_WORDS, MIN_REFINED_RATIO * 100)
        )
        log.warning("Refiner attempt %d/%d failed: %s. Retrying with expand instruction.", attempt, MAX_REFINER_ATTEMPTS, last_error)
        content_to_refine = refined  # Feed previous output back for next attempt
        if attempt == MAX_REFINER_ATTEMPTS:
            raise last_error

    raise last_error  # unreachable but safe


if __name__ == "__main__":
    draft = json.loads(sys.stdin.read())
    result = refine_article(draft)
    print(json.dumps(result, indent=2, ensure_ascii=False))
