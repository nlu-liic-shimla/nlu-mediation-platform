"""
subsystem_c.py
Sub-system C — Questionnaire Generation
Owner: Rishika (built by Vaidant as support)
Input: ConflictExtraction JSON
Output: QuestionnaireOutput (see schemas.py)

Generates 8-12 targeted questions per party based on dispute type.
Questions are tailored — not generic.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, QuestionnaireOutput, Question
from ai.utils.ai_client import call_small, is_failed


SYSTEM_PROMPT = """
You are a legal mediator generating targeted questions for a mediation case.
Based on the conflict details provided, generate 8-12 specific questions
that will help clarify the dispute and assist in reaching a settlement.

RULES:
1. Questions must be specific to the dispute type — not generic
2. Each question must have a clear purpose
3. Direct questions at the right party — party_a, party_b, or both
4. Use appropriate question types:
   - open_ended: for detailed explanations
   - yes_no: for confirming facts
   - scale_1_5: for measuring severity or satisfaction
5. Never ask leading questions that favour either party
6. Focus on facts, evidence, and desired outcomes

DISPUTE TYPE SPECIFIC FOCUS:
- landlord_tenant: lease terms, deposit receipts, condition reports, notice periods
- employment: contract terms, termination procedure, notice given, HR records
- commercial_contract: contract existence, deliverables, payment terms, communications
- property_boundary: survey records, historical usage, documentation, witnesses
- family_business: partnership agreement, contributions, profit records, valuation
- construction: contract scope, timeline, quality standards, payment milestones
- consumer: purchase proof, warranty terms, complaint history, repair attempts
- other: focus on the core claimed facts and desired resolution

Return ONLY valid JSON in this exact format:
{
    "questions": [
        {
            "question_id": "q_01",
            "question_text": "the question here",
            "directed_at": "party_a or party_b or both",
            "question_type": "open_ended or yes_no or scale_1_5",
            "purpose": "why this question is being asked"
        }
    ],
    "questionnaire_rationale": "brief explanation of why these questions were chosen"
}

Generate between 8 and 12 questions. No more, no less.
"""


def generate_questionnaire(conflict: ConflictExtraction) -> QuestionnaireOutput:
    """
    Generate targeted questionnaire based on conflict extraction.
    Returns QuestionnaireOutput on success.
    Returns failure dict on error — always check is_failed().
    """

    user_message = f"""
Dispute type: {conflict.dispute_type.value}
Core dispute: {conflict.core_dispute}

Party A claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_a)}

Party B claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_b)}

Disputed facts:
{chr(10).join(f'- {fact}' for fact in conflict.disputed_facts)}

Undisputed facts:
{chr(10).join(f'- {fact}' for fact in conflict.undisputed_facts) if conflict.undisputed_facts else '- None identified'}

Monetary value: {conflict.monetary_value} INR
Jurisdiction clear: {conflict.jurisdiction_clear}

Generate 8-12 targeted questions for this mediation case.
"""

    result = call_small(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=QuestionnaireOutput
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

    print("Running Sub-system A first...")
    conflict = extract_conflict(party_a, party_b)

    print("Running Sub-system C...")
    result = generate_questionnaire(conflict)

    if is_failed(result):
        print(f"FAILED: {result}")
    else:
        print(f"\n✅ Generated {len(result.questions)} questions")
        print(f"Rationale: {result.questionnaire_rationale}\n")
        for q in result.questions:
            print(f"[{q.question_id}] → {q.directed_at} ({q.question_type})")
            print(f"  Q: {q.question_text}")
            print(f"  Purpose: {q.purpose}\n")