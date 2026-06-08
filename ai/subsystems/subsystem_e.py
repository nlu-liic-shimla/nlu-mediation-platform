"""
subsystem_e.py
Sub-system E — Bias Removal
Owner: Rishika
Input (function 1): raw party statement string  ← used in Burst 1 Step 1
Input (function 2): NeutralSummary object       ← used after summary is generated
Output: BiasRemovalOutput (see schemas.py)

Per master document Section 5.6:
  Burst 1 Step 1 runs E on RAW statements
  A then uses the cleaned text from E as input

Simplified per master document:
  Runs once — no retry loop
  If bias detected: produces revised version
  If validation fails: mediator sees red badge, case proceeds
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import NeutralSummary, BiasRemovalOutput
from ai.utils.ai_client import call_small, is_failed

# ── Prompt for summary-level bias check ───────────────────────
SUMMARY_BIAS_PROMPT = """
You are a bias detection specialist for a legal mediation platform in India.

You will receive a neutral summary of a dispute written by an AI mediator.
Your job is to detect any bias in the summary and suggest corrections.

A summary is biased if it:
1. Uses stronger or more credible language for one party's claims
2. Presents one party's version with more detail than the other
3. Uses words that imply one party is truthful and the other is not
4. Includes emotional language that favours one side
5. Uses loaded terminology that advantages one party

RULES:
1. If no bias found — set bias_detected to false, bias_flags to empty list
2. If bias found — set bias_detected to true and provide revised versions
3. revised_summary is REQUIRED when bias_detected is true
4. bias_check_passed is true when summary is safe to show
5. Keep the same facts — only change biased language to neutral language
6. Both party positions must have equal detail and credibility

Return ONLY valid JSON matching the required schema. Nothing else.
"""

# ── Prompt for raw statement bias removal ─────────────────────
RAW_STATEMENT_BIAS_PROMPT = """
You are a bias removal specialist for a legal mediation platform in India.

You will receive a raw party statement.
Remove emotional language, personal attacks, and biased framing
while keeping ALL factual claims intact.

RULES:
1. Keep every factual claim — do not remove or alter facts
2. Remove emotional language
   e.g. "he cheated me" → "the party did not fulfil the agreement"
3. Remove personal attacks and character judgements
4. Use neutral, factual language throughout
5. If the statement is already neutral — return it unchanged

Return ONLY valid JSON in this EXACT format:
{
    "bias_detected": true or false,
    "bias_flags": [
        {
            "bias_type": "emotional_language",
            "original_phrase": "the exact biased phrase from the statement",
            "suggested_replacement": "the neutral replacement phrase",
            "affects_party": "party_b"
        }
    ],
    "revised_summary": "cleaned statement text here",
    "revised_party_a_position": null,
    "revised_party_b_position": null,
    "bias_check_passed": true
}

CRITICAL — bias_type MUST be exactly one of these lowercase values:
  - emotional_language   (angry or emotive words)
  - one_sided_framing    (presenting only one perspective)
  - loaded_terminology   (words that imply guilt or fault)
  - factual_assumption   (stating an unproven claim as fact)
  - none_detected        (no bias found — use only in empty list)

Do NOT use UPPERCASE. Do NOT invent other bias types like PERSONAL_ATTACK.
Map personal attacks to emotional_language or loaded_terminology instead.

If no bias is found, set bias_flags to an empty list [].
revised_summary MUST always be populated.
Return ONLY JSON. No explanation. No markdown.
"""


def remove_bias(summary: NeutralSummary) -> BiasRemovalOutput | dict:
    """
    Run sub-system E on NeutralSummary output.
    Used after sub-system B generates the neutral summary.
    Returns BiasRemovalOutput on success.
    Always check is_failed() before using result.
    """

    user_message = f"""
Check this mediation summary for bias and correct if needed:

FULL SUMMARY:
{summary.summary}

PARTY A POSITION:
{summary.party_a_position}

PARTY B POSITION:
{summary.party_b_position}

KEY ISSUES:
{chr(10).join(f'- {issue}' for issue in summary.key_issues)}

Detect any bias and return corrected versions if needed.
"""

    result = call_small(
        system_prompt=SUMMARY_BIAS_PROMPT,
        user_message=user_message,
        output_model=BiasRemovalOutput
    )

    return result


def remove_bias_from_statement(
    raw_statement: str,
    party_label: str = "party"
) -> BiasRemovalOutput | dict:
    """
    Run sub-system E on a RAW party statement string.
    Used in Burst 1 Step 1 — BEFORE conflict extraction runs.
    The cleaned text is in result.revised_summary.
    Always check is_failed() before using result.
    """

    user_message = f"""
Remove bias and emotional language from this {party_label} statement
while keeping all factual claims intact:

STATEMENT:
{raw_statement}

Return the cleaned version.
"""

    result = call_small(
        system_prompt=RAW_STATEMENT_BIAS_PROMPT,
        user_message=user_message,
        output_model=BiasRemovalOutput
    )

    return result


def get_cleaned_statement(raw_statement: str, party_label: str = "party") -> str:
    """
    Convenience function used by the pipeline.
    Returns cleaned statement text.
    Falls back to original statement if bias removal fails.
    Never raises — always returns a usable string.
    """
    result = remove_bias_from_statement(raw_statement, party_label)

    if is_failed(result):
        print(f"  ⚠️  Bias removal failed for {party_label} — using original")
        print(f"      Reason: {result}")
        return raw_statement

    if result.revised_summary:
        return result.revised_summary

    return raw_statement


# ── Public alias expected by test_everything.py ───────────────
def run_subsystem_e(raw_statement: str, party_label: str = "party") -> BiasRemovalOutput | dict:
    """
    Public entry point used by tests and external callers.
    Alias for remove_bias_from_statement.
    """
    return remove_bias_from_statement(raw_statement, party_label)


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
    party_a = """
    I vacated the flat on October 1 2025 after giving 30 days notice.
    The flat was clean and in good condition. I have photos from move-out day.
    The landlord has not returned my security deposit of 50000 INR despite
    three written requests. It has been 3 months.
    """

    party_b = """
    The tenant unfairly damaged my property and left without warning.
    The flat was completely ruined. He is a dishonest person and owes me
    everything. I have invoices proving the damage cost 45000 INR.
    """

    print("=" * 50)
    print("TEST 1 — Raw statement bias removal")
    print("=" * 50)

    cleaned_a = get_cleaned_statement(party_a, "Party A")
    cleaned_b = get_cleaned_statement(party_b, "Party B")

    print(f"\nParty A original:\n{party_a.strip()}")
    print(f"\nParty A cleaned:\n{cleaned_a}")
    print(f"\nParty B original:\n{party_b.strip()}")
    print(f"\nParty B cleaned:\n{cleaned_b}")
