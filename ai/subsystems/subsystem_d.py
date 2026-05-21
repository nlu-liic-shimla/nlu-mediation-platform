"""
subsystem_d.py
Sub-system D — BATNA/WATNA Scoring
Owner: Vaidant
Input: ConflictExtraction + questionnaire responses
Output: BatnaWatnaOutput (see schemas.py)

Runs in Burst 2 — AFTER questionnaire responses are received.
Never runs on raw party statements.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, BatnaWatnaOutput
from ai.utils.ai_client import call_large, is_failed

SYSTEM_PROMPT = """
You are a BATNA/WATNA specialist with deep knowledge of Indian dispute
resolution under the Mediation Act 2023.

BATNA = Best Alternative to a Negotiated Agreement
The best realistic outcome a party can get if they walk away from mediation.

WATNA = Worst Alternative to a Negotiated Agreement  
The worst realistic outcome if they walk away from mediation.

SCORING RULES:
- batna_score and watna_score are 1-10 (internal use only)
- batna_score must ALWAYS be >= watna_score
- 1-3: Weak position — should accept a reasonable offer
- 4-6: Moderate position — has some leverage
- 7-10: Strong position — can afford to hold out

LABEL RULES:
- 7-10 = Strong
- 4-6 = Moderate  
- 1-3 = Weak

IMPORTANT RULES:
1. Base scores on legal merit and evidence strength — not sympathy
2. Never reveal Party A scores to Party B or vice versa
3. If jurisdiction is unclear set consult_solicitor_flag to true
4. Keep reasoning factual — do not predict exact court outcomes
5. overall_settlement_zone should describe where a realistic agreement exists
6. Always include the standard disclaimer

Return ONLY valid JSON matching the required schema. Nothing else.
"""

def generate_batna_watna(conflict: ConflictExtraction, questionnaire_responses: dict = None):
    """
    Run sub-system D on ConflictExtraction output.
    questionnaire_responses is optional for now — will be required in Week 4.
    Returns BatnaWatnaOutput on success.
    Returns failure dict on error — always check is_failed().
    """

    questionnaire_text = ""
    if questionnaire_responses:
        questionnaire_text = f"""
Questionnaire Responses:
Party A responses: {questionnaire_responses.get('party_a', 'Not yet received')}
Party B responses: {questionnaire_responses.get('party_b', 'Not yet received')}
"""

    user_message = f"""
Calculate BATNA and WATNA for both parties based on this conflict:

Dispute Type: {conflict.dispute_type}
Core Dispute: {conflict.core_dispute}

Party A Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_a)}

Party B Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_b)}

Disputed Facts:
{chr(10).join(f'- {fact}' for fact in conflict.disputed_facts)}

Monetary Value: {f'INR {conflict.monetary_value}' if conflict.monetary_value else 'Not specified'}

Jurisdiction Clear: {conflict.jurisdiction_clear}

{questionnaire_text}

Calculate BATNA and WATNA scores and reasoning for both parties.
"""

    result = call_large(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=BatnaWatnaOutput
    )

    return result


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
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
        print("Sub-system A done. Running sub-system D...")
        result = generate_batna_watna(conflict)

        if is_failed(result):
            print("FAILED:", result)
        else:
            print("\nSUCCESS!")
            print("\nPARTY A:")
            print(f"  BATNA: {result.party_a.batna_label} ({result.party_a.batna_score}/10)")
            print(f"  WATNA: {result.party_a.watna_label} ({result.party_a.watna_score}/10)")
            print(f"  BATNA Reasoning: {result.party_a.batna_reasoning}")
            print(f"  WATNA Reasoning: {result.party_a.watna_reasoning}")
            print(f"  Guidance: {result.party_a.negotiation_guidance}")
            print("\nPARTY B:")
            print(f"  BATNA: {result.party_b.batna_label} ({result.party_b.batna_score}/10)")
            print(f"  WATNA: {result.party_b.watna_label} ({result.party_b.watna_score}/10)")
            print(f"  BATNA Reasoning: {result.party_b.batna_reasoning}")
            print(f"  WATNA Reasoning: {result.party_b.watna_reasoning}")
            print(f"  Guidance: {result.party_b.negotiation_guidance}")
            print("\nSETTLEMENT ZONE:")
            print(result.overall_settlement_zone)
            print("\nDISCLAIMER:")
            print(result.disclaimer) 