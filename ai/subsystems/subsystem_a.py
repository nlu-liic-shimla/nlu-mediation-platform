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
   - 0.8-1.0: Very clear statements with specific facts and no ambiguity
   - 0.5-0.8: Moderately clear with some ambiguity
   - 0.0-0.5: Vague, contradictory, or unclear statements — if you
              cannot clearly identify what the dispute is actually about,
              confidence MUST be below 0.5
   - If dispute_type is "other" — confidence should almost always be
     below 0.5 since the dispute is unclear by definition

DISPUTE TYPES — pick exactly one:
landlord_tenant, employment, commercial_contract, property_boundary,
family_business, construction, consumer, debt_recovery, other

DISPUTE TYPE DEFINITIONS — read carefully before choosing:
- "landlord_tenant"     : disputes between a landlord and tenant about rent, deposit, damage, eviction
- "employment"          : disputes between employer and employee about salary, termination, contract
- "commercial_contract" : disputes between two businesses or individuals over a service or product contract
- "property_boundary"   : disputes between neighbours about land boundaries, walls, encroachment
- "family_business"     : disputes between FAMILY MEMBERS or PARTNERS who personally know each other about a shared business, partnership dissolution, profit sharing — even if it looks like a contract dispute, if the parties are partners or family, use this
- "construction"        : disputes about building work quality, delays, payments to contractors
- "consumer"            : disputes between a customer and a seller or manufacturer about a product or service
- "debt_recovery"       : ONLY for clear loan or money lending disputes where one party lent money to another
- "other"               : use this when the dispute is vague, unclear, ambiguous, or does not clearly fit any category above — when in doubt use "other" not "debt_recovery"

CRITICAL RULES:
- If two people were in a business partnership together — always use "family_business" even if they are not related by blood
- If the dispute mentions "partners", "partnership", "profit sharing", "business together" — use "family_business"
- "debt_recovery" requires an explicit loan — do NOT use it for vague money disputes
- When the dispute is unclear or ambiguous — ALWAYS use "other"

IMPORTANT DISPUTE TYPE RULES:
- If the dispute is vague, unclear, or does not fit any category — use "other"
- "debt_recovery" is ONLY for clear loan or money lending disputes
- Never guess — when unsure always use "other"

You MUST return ONLY this exact JSON structure — all fields are required:

{
  "dispute_type": "one of the dispute types above",
  "core_dispute": "one to two sentence neutral description of the central disagreement",
  "claims_party_a": ["claim 1", "claim 2", "claim 3"],
  "claims_party_b": ["claim 1", "claim 2", "claim 3"],
  "disputed_facts": ["fact 1", "fact 2"],
  "undisputed_facts": ["fact 1"],
  "monetary_value": 50000,
  "jurisdiction_clear": true,
  "extraction_confidence": 0.85
}

FIELD RULES — read carefully:
- "claims_party_a" — MUST be a LIST of strings, minimum 1 item, never a dict or object
- "claims_party_b" — MUST be a LIST of strings, minimum 1 item, never a dict or object
- "disputed_facts" — MUST be a LIST of strings
- "undisputed_facts" — MUST be a LIST of strings, can be empty []
- "monetary_value" — number in INR or null if not mentioned
- "jurisdiction_clear" — true or false (boolean, not string)
- "extraction_confidence" — decimal between 0.0 and 1.0

Return ONLY the JSON object. No explanation. No markdown. No extra text.
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