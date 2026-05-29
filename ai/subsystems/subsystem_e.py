"""
subsystem_e.py
Sub-system E — Bias Removal
Owner: Rishika (written by Vaidant as support)
Input: NeutralSummary output from sub-system B
Output: BiasRemovalOutput (see schemas.py)

Runs on NeutralSummary output before anything is shown to parties.
If bias detected — revised_summary replaces the original.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import NeutralSummary, BiasRemovalOutput
from ai.utils.ai_client import call_small, is_failed

SYSTEM_PROMPT = """
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
6. Both party positions must have equal detail and credibility in revised version

Return ONLY valid JSON matching the required schema. Nothing else.
"""

def remove_bias(summary: NeutralSummary):
    """
    Run sub-system E on NeutralSummary output.
    Returns BiasRemovalOutput on success.
    Returns failure dict on error — always check is_failed().
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
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=BiasRemovalOutput
    )

    return result


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
    from ai.subsystems.subsystem_a import extract_conflict
    from ai.subsystems.subsystem_b import generate_neutral_summary

    party_a = """
    I vacated the flat on October 1 2025 after giving 30 days notice.
    The flat was clean and in good condition. I have photos from move-out day.
    The landlord has not returned my security deposit of 50000 INR despite
    three written requests. It has been 3 months.
    """

    party_b = """
    The tenant left on October 3 two days after the agreed date without
    informing me. The flat was damaged with wall marks, a broken ceiling fan
    and cracked bathroom tiles. Repairs cost 45000 INR and I have invoices.
    The deposit was 50000 INR and I am deducting repair costs.
    """

    print("Running sub-system A...")
    conflict = extract_conflict(party_a, party_b)

    if is_failed(conflict):
        print("Sub-system A failed:", conflict)
    else:
        print("Running sub-system B...")
        summary = generate_neutral_summary(conflict)

        if is_failed(summary):
            print("Sub-system B failed:", summary)
        else:
            print("Running sub-system E...")
            result = remove_bias(summary)

            if is_failed(result):
                print("FAILED:", result)
            else:
                print("\nSUCCESS!")
                print("Bias detected:", result.bias_detected)
                print("Bias check passed:", result.bias_check_passed)
                if result.bias_detected:
                    print("Flags:", result.bias_flags)
                    print("Revised summary:", result.revised_summary)
                else:
                    print("No bias found — original summary is safe to use!")