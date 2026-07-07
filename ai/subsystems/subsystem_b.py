"""
subsystem_b.py
Sub-system B — Neutral Summary Generation
Owner: Vaidant
Input: ConflictExtraction output from sub-system A
Output: NeutralSummary (see schemas.py)

IMPORTANT: This sub-system receives ConflictExtraction JSON only.
It never receives raw party statements directly.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, NeutralSummary
from ai.utils.ai_client import call_large, is_failed

SYSTEM_PROMPT = """
You are a senior Indian legal mediator writing a case brief for a colleague
who will conduct the mediation session. They have no prior knowledge of this case.

You will receive a structured conflict extraction JSON.
Your job is to write a clear, balanced, neutral summary of the dispute.

RULES:
1. Be completely neutral — a reader must not be able to tell which party you find more credible
2. Do not use "Party A claims" and "Party B denies" — this implies one is truthful
3. Instead use: "Party A states... Party B states..." or "The parties disagree on..."
4. Do not include any information not present in the extraction JSON
5. Do not offer legal opinions or predict outcomes
6. Write party_a_position and party_b_position with equal length and detail
7. key_issues must be ordered by importance — most important first
8. common_ground should only be filled if there are genuine shared interests
9. bias_check_required must always be true

STRUCTURE YOUR SUMMARY AS:
- Opening: what type of dispute and relationship between parties
- Party A position: their main claims and desired outcome
- Party B position: their main claims and desired outcome
- Key issues: specific points that remain unresolved
- Common ground: any shared interests if they exist

Return ONLY valid JSON with these exact top-level keys:
{
  "summary": "<string>",
  "party_a_position": "<string>",
  "party_b_position": "<string>",
  "key_issues": ["<string>", ...],
  "common_ground": "<string or null>",
  "bias_check_required": true
}
Do NOT nest the output. No markdown. No extra keys.
"""

def generate_neutral_summary(conflict: ConflictExtraction):
    """
    Run sub-system B on ConflictExtraction output.
    Returns NeutralSummary on success.
    Returns failure dict on error — always check is_failed().
    """

    user_message = f"""
Generate a neutral mediator summary based on this conflict extraction:

Dispute Type: {conflict.dispute_type}
Core Dispute: {conflict.core_dispute}

Party A Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_a)}

Party B Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_b)}

Disputed Facts:
{chr(10).join(f'- {fact}' for fact in conflict.disputed_facts)}

Undisputed Facts:
{chr(10).join(f'- {fact}' for fact in conflict.undisputed_facts) if conflict.undisputed_facts else 'None identified'}

Monetary Value: {f'INR {conflict.monetary_value}' if conflict.monetary_value else 'Not specified'}

Write a neutral mediator summary from this information.
"""

    result = call_large(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=NeutralSummary
    )

    return result


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
    # First run sub-system A to get conflict extraction
    from ai.subsystems.subsystem_a import extract_conflict

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

    print("Running sub-system A first...")
    conflict = extract_conflict(party_a, party_b)

    if is_failed(conflict):
        print("Sub-system A failed:", conflict)
    else:
        print("Sub-system A done. Running sub-system B...")
        result = generate_neutral_summary(conflict)

        if is_failed(result):
            print("FAILED:", result)
        else:
            print("\nSUCCESS!")
            print("\nSUMMARY:")
            print(result.summary)
            print("\nPARTY A POSITION:")
            print(result.party_a_position)
            print("\nPARTY B POSITION:")
            print(result.party_b_position)
            print("\nKEY ISSUES:")
            for issue in result.key_issues:
                print(f"  - {issue}")
            print("\nCOMMON GROUND:")
            print(result.common_ground)