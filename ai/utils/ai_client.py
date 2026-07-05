"""
ai_client.py
NLU Shimla — AI-Powered Mediation Platform
-------------------------------------------
Shared Groq API utility used by all 7 subsystems.

Using Groq (free) during development.
For demo week, swap LARGE_MODEL and SMALL_MODEL back to Claude — see bottom of file.

Every AI call in this project goes through call_with_retry().
Nobody writes their own API call or retry logic in a subsystem file.

Usage:
    from ai.utils.claude_client import call_large, call_small, is_failed
    from ai.schemas import ConflictExtraction

    result = call_large(
        system_prompt=YOUR_SYSTEM_PROMPT,
        user_message="Party A said... Party B said...",
        output_model=ConflictExtraction
    )

    if is_failed(result):
        # handle failure
        return result

    print(result.dispute_type)  # safe to use
"""

import json
import os
from typing import Type, TypeVar

from groq import Groq
from pydantic import BaseModel, ValidationError 
from dotenv import load_dotenv
load_dotenv()

# ── Types ─────────────────────────────────────────────────────────────────────
T = TypeVar("T", bound=BaseModel)

# ── Models ────────────────────────────────────────────────────────────────────
# Groq (free — use during development)
LARGE_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # newest free large model
SMALL_MODEL = "llama-3.1-8b-instant"                        # keep same — still available

# ── Switch to Claude for demo week ────────────────────────────────────────────
# When you're ready for demo, comment out the Groq lines above and uncomment these:
# from anthropic import Anthropic  — also swap the client below
# LARGE_MODEL = "claude-sonnet-4-5"
# SMALL_MODEL = "claude-haiku-4-5-20251001"

MAX_RETRIES = 3

JSON_INSTRUCTION = """
CRITICAL: Your entire response must be valid JSON and nothing else.
- No explanation before the JSON
- No markdown code fences (no ```json)
- No text after the JSON
- Must be parseable by json.loads()
"""


# ── Main function ─────────────────────────────────────────────────────────────

def call_with_retry(
    system_prompt: str,
    user_message: str,
    output_model: Type[T],
    model: str = LARGE_MODEL,
) -> T | dict:
    """
    Call Groq, parse JSON, validate against Pydantic model.
    Retries up to MAX_RETRIES times if parsing or validation fails.
    On each retry, the previous error is fed back so the model
    knows exactly what it got wrong.

    Returns:
        A validated Pydantic model instance on success.
        {"status": "failed", "reason": "...", "last_error": "..."} on total failure.

    Callers must check is_failed(result) before using the result.
    """

    from dotenv import load_dotenv
    load_dotenv()
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    full_system_prompt = system_prompt.strip() + "\n\n" + JSON_INSTRUCTION.strip()

    # conversation history — grows on retries
    messages = [
        {"role": "system", "content": full_system_prompt},
        {"role": "user",   "content": user_message},
    ]

    last_error       = None
    last_raw_response = ""

    for attempt in range(1, MAX_RETRIES + 1):

        # on retry: append what went wrong so the model can fix it
        if attempt > 1:
            messages.append({"role": "assistant", "content": last_raw_response})
            messages.append({
                "role": "user",
                "content": (
                    f"Your previous response failed with this error:\n"
                    f"{last_error}\n\n"
                    f"Return only the corrected JSON. No explanation. No markdown."
                )
            })

        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1500,
                temperature=0.1,  # low temperature = more consistent JSON output
            )

            raw_text          = response.choices[0].message.content.strip()
            last_raw_response = raw_text

            # strip markdown fences if model adds them anyway
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            # parse JSON
            try:
                parsed = json.loads(raw_text)
            except json.JSONDecodeError as e:
                last_error = f"Invalid JSON on attempt {attempt}: {e}. Got: {raw_text[:300]}"
                continue

            # validate with Pydantic
            try:
                validated = output_model(**parsed)
                return validated  # success
            except ValidationError as e:
                last_error = f"Pydantic validation failed on attempt {attempt}:\n{e}"
                continue

        except Exception as e:
            # network error, rate limit, etc — don't retry
            return {
                "status":     "failed",
                "reason":     f"API error on attempt {attempt}: {str(e)}",
                "last_error": str(e),
            }

    # all retries exhausted
    return {
        "status":     "failed",
        "reason":     f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}",
        "last_error": last_error,
    }


# ── Convenience wrappers ──────────────────────────────────────────────────────

def call_large(system_prompt: str, user_message: str, output_model: Type[T]) -> T | dict:
    """
    Use for subsystems A, B, D — complex reasoning tasks.
    Maps to llama-3.3-70b (Groq) or claude-sonnet (demo week).
    """
    return call_with_retry(system_prompt, user_message, output_model, LARGE_MODEL)


def call_small(system_prompt: str, user_message: str, output_model: Type[T]) -> T | dict:
    """
    Use for subsystems C, E, F, G — simpler structured tasks.
    Maps to llama-3.1-8b (Groq) or claude-haiku (demo week).
    """
    return call_with_retry(system_prompt, user_message, output_model, SMALL_MODEL)

def call_large_text(system_prompt: str, user_message: str) -> str | dict:
    """
    Use when you need plain text back — not JSON or Pydantic model.
    Used by proposal_draft.py and subsystem_h.py.
    Returns plain string on success.
    Returns failure dict on error — check is_failed() before using.
    """
    from dotenv import load_dotenv
    load_dotenv()
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    try:
        response = client.chat.completions.create(
            model=LARGE_MODEL,
            messages=[
                {"role": "system", "content": system_prompt.strip()},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=1500,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return {
            "status":     "failed",
            "reason":     f"API error: {str(e)}",
            "last_error": str(e),
        }


def call_large_json(system_prompt: str, user_message: str) -> dict:
    """
    Use when you need a plain JSON dict back — not a Pydantic model.
    Used by subsystem_h.py for revision output.
    Returns parsed dict on success.
    Returns failure dict on error — check is_failed() before using.
    """
    from dotenv import load_dotenv
    load_dotenv()
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    full_system = system_prompt.strip() + "\n\n" + JSON_INSTRUCTION.strip()
    messages = [
        {"role": "system", "content": full_system},
        {"role": "user",   "content": user_message},
    ]

    last_error = ""
    last_raw = ""

    for attempt in range(1, MAX_RETRIES + 1):
        if attempt > 1:
            messages.append({"role": "assistant", "content": last_raw})
            messages.append({
                "role": "user",
                "content": (
                    f"Your previous response failed:\n{last_error}\n\n"
                    f"Return only corrected JSON. No explanation. No markdown."
                )
            })

        try:
            response = client.chat.completions.create(
                model=LARGE_MODEL,
                messages=messages,
                max_tokens=1500,
                temperature=0.1,
            )
            raw = response.choices[0].message.content.strip()
            last_raw = raw

            # Strip markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            try:
                parsed = json.loads(raw)
                return parsed
            except json.JSONDecodeError as e:
                last_error = f"Invalid JSON on attempt {attempt}: {e}"
                continue

        except Exception as e:
            return {
                "status":     "failed",
                "reason":     f"API error on attempt {attempt}: {str(e)}",
                "last_error": str(e),
            }

    return {
        "status":     "failed",
        "reason":     f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}",
        "last_error": last_error,
    }


# ── Helper ────────────────────────────────────────────────────────────────────

def is_failed(result) -> bool:
    """
    Check if result is a failure dict before accessing model fields.

    Always do this:
        result = call_large(...)
        if is_failed(result):
            return result   # let Celery task handle it
        print(result.dispute_type)  # safe now
    """
    return isinstance(result, dict) and result.get("status") == "failed"
