"""
conflict_extraction.py
Sub-system A — Conflict Extraction
Owner: Vaidant
Input: raw party statements
Output: ConflictExtraction (see schemas.py)
"""
from dotenv import load_dotenv
load_dotenv()
from ai.schemas import ConflictExtraction
from ai.utils.ai_client import call_large, is_failed

SYSTEM_PROMPT = """
You are a senior Indian legal mediator with expertise in dispute resolution
under India's Mediation Act 2023.

You will receive two party statements from a dispute.
Your job is to extract the structured conflict information.

RULES:
1. Be completely neutral — do not favour either party
2. Extract only what is stated — do not invent facts
3. Use "Party A" and "Party B" — never real names
4. If monetary value is not mentioned — set to null
5. Set extraction_confidence based on how clear the statements are:
   - 0.8-1.0: Very clear statements with specific facts
   - 0.5-0.8: Moderately clear with some ambiguity
   - 0.0-0.5: Vague or contradictory statements

DISPUTE TYPES:
landlord_tenant, employment, commercial_contract, property_boundary,
family_business, construction, consumer, debt_recovery, other

Return ONLY valid JSON matching the required schema. Nothing else.
"""

def extract_conflict(party_a_statement: str, party_b_statement: str):
    """
    Run sub-system A on two party statements.
    Returns ConflictExtraction on success.
    Returns failure dict on error — always check is_failed().
    """

    user_message = f"""
PARTY A STATEMENT:
{party_a_statement}

PARTY B STATEMENT:
{party_b_statement}

Extract the conflict structure from these two statements.
"""

    result = call_large(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=ConflictExtraction
    )

    return result


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
    # Test with S-01 landlord-tenant scenario
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

    result = extract_conflict(party_a, party_b)

    if is_failed(result):
        print("FAILED:", result)
    else:
        print("SUCCESS!")
        print("Dispute type:", result.dispute_type)
        print("Core dispute:", result.core_dispute)
        print("Confidence:", result.extraction_confidence)
        print("Party A claims:", result.claims_party_a)
        print("Party B claims:", result.claims_party_b)