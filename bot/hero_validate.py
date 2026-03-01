"""
hero_validate.py — Validates hero images for text overlay suitability using Groq Vision.

Analyzes an image to determine if there is a clear region suitable for overlaying
a large title without overlapping text or busy areas. Returns a recommendation
for layout (e.g. top-left, center) or suggests trying another image.

Usage:
    python hero_validate.py --image-url "https://..." --title "Article Title"
    python hero_validate.py --image-path /path/to/image.jpg --title "Article Title"
"""

import argparse
import base64
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import config

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [hero_validate] %(levelname)s %(message)s")

GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

VALIDATION_PROMPT = """Analyze this image. It will be used as a hero/cover image for a blog article. A large title text will be overlaid on top of it.

Answer in this exact JSON format only (no other text):
{"suitable": true or false, "recommendation": "brief explanation", "suggested_region": "top-left" or "center" or "bottom-left"}

Consider:
- Is there a clear, uncluttered region (e.g. top-left, center, bottom) where white text would be readable?
- Are there busy areas, text, or high-contrast details that would make an overlay look messy?
- If suitable, suggest the best region. If not suitable, set suitable to false and explain why."""


def _encode_local_image(path: Path) -> str:
    """Encode local image to base64 data URL."""
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    ext = path.suffix.lower()
    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png" if ext == ".png" else "image/webp"
    return f"data:{mime};base64,{b64}"


def _call_groq_vision(image_url_or_data: str, title: str) -> str:
    """Call Groq Vision API with image and prompt. Returns raw response text."""
    if not config.groq.api_key:
        raise ValueError("GROQ_API_KEY not set in environment")

    try:
        from groq import Groq
    except ImportError:
        raise ImportError("Install groq: pip install groq")

    client = Groq(api_key=config.groq.api_key)
    prompt = f"Title to overlay: \"{title}\"\n\n{VALIDATION_PROMPT}"

    response = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url_or_data},
                    },
                ],
            }
        ],
        max_completion_tokens=512,
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


def _parse_response(raw: str) -> Dict[str, Any]:
    """Parse Groq response into structured dict. Handles markdown code blocks."""
    text = raw.strip()
    # Extract JSON from markdown code block if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()
    else:
        # Try to find JSON object
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group(0)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        log.warning("Could not parse Groq response as JSON: %s", e)
        return {
            "suitable": True,
            "recommendation": "Could not parse response; assuming suitable.",
            "suggested_region": "top-left",
        }

    return {
        "suitable": bool(data.get("suitable", True)),
        "recommendation": str(data.get("recommendation", "")),
        "suggested_region": str(data.get("suggested_region", "top-left")).lower()
        or "top-left",
    }


def validate_hero(
    image_url: Optional[str] = None,
    image_path: Optional[Path] = None,
    title: str = "",
) -> Dict[str, Any]:
    """
    Validate a hero image for text overlay suitability.

    Args:
        image_url: URL of the hero image (e.g. from Unsplash CDN).
        image_path: Local path to image file (alternative to image_url).
        title: The title text that will be overlaid.

    Returns:
        Dict with keys: suitable (bool), recommendation (str), suggested_region (str).
    """
    if image_url and image_path:
        raise ValueError("Provide either image_url or image_path, not both")
    if not image_url and not image_path:
        raise ValueError("Provide image_url or image_path")

    if image_path:
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        image_input = _encode_local_image(path)
    else:
        image_input = image_url

    raw = _call_groq_vision(image_input, title or "Article Title")
    return _parse_response(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate hero image for text overlay")
    parser.add_argument("--image-url", help="URL of hero image")
    parser.add_argument("--image-path", help="Local path to hero image")
    parser.add_argument("--title", default="Article Title", help="Title to overlay")
    parser.add_argument("--json", action="store_true", help="Output result as JSON only")
    args = parser.parse_args()

    if not args.image_url and not args.image_path:
        parser.error("Provide --image-url or --image-path")

    try:
        result = validate_hero(
            image_url=args.image_url,
            image_path=Path(args.image_path) if args.image_path else None,
            title=args.title,
        )
    except Exception as e:
        log.error("%s", e)
        if args.json:
            print(json.dumps({"error": str(e), "suitable": False}))
        return 1

    if args.json:
        print(json.dumps(result))
    else:
        log.info("Suitable: %s", result["suitable"])
        log.info("Region: %s", result["suggested_region"])
        log.info("Recommendation: %s", result["recommendation"])
        print(json.dumps(result, indent=2))

    return 0 if result["suitable"] else 0  # Exit 0 either way; caller decides


if __name__ == "__main__":
    sys.exit(main())
