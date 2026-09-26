"""
subsystem_c.py
Sub-system C — Questionnaire Generation
Owner: Rishika
Input: ConflictExtraction JSON from sub-system A
Output: QuestionnaireOutput (see schemas.py)

Runs in Burst 2 — after Burst 1 is complete.
Mediator triggers this by clicking Send Questionnaire.
Questions must be tailored to the specific dispute type.
Generic questions = prompt failure.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, QuestionnaireOutput
from ai.utils.ai_client import call_small, is_failed

SYSTEM_PROMPT = """
You are a legal mediator generating a targeted questionnaire for both parties
in a dispute in India under the Mediation Act 2023.

You will receive a structured conflict extraction JSON.
Generate 8 to 10 targeted questions based on the specific dispute type and facts.

IMPORTANT PARTY DEFINITIONS:
- "requesting_party" = Party A — the one who initiated the dispute
- "against_party" = Party B — the one responding to the dispute
- Questions directed at "requesting_party" must be based on Party A Claims only
- Questions directed at "against_party" must be based on Party B Claims only
- Never assign a question about Party B's claims to requesting_party
- Never assign a question about Party A's claims to against_party


RULES:
1. Questions must be specific to THIS dispute — not generic
2. Different dispute types need different questions:
   - landlord_tenant: focus on deposit, condition, dates, notice period
   - employment: focus on contract terms, notice period, performance records
   - commercial_contract: focus on deliverables, deadlines, payment terms
   - neighbour_dispute: focus on survey records, documents, timeline of construction
   - family_business: focus on partnership deed, contributions, profit sharing
   - construction: focus on contract, deadlines, quality standards, payments
   - consumer: focus on warranty, usage, complaint timeline
   - debt_recovery: focus on loan agreement, repayment terms, evidence

For neighbour_dispute:
  - How long have the parties been neighbours?
  - Have they attempted informal resolution before?
  - Is there a written agreement about shared space?
  - What specific resource or space is at dispute?
  - Has this caused any physical damage or financial loss?

3. Each question must have a clear purpose
4. directed_at must be "requesting_party", "against_party", or "both"
5. question_type must be "open_ended", "yes_no", or "scale_1_5"
6. question_id must be "q_01", "q_02" etc
7. questionnaire_rationale explains why these questions were chosen

QUESTION QUALITY CHECK:
- Would this question reveal genuinely new information?
- Is it specific to the facts of this dispute?
- Could a mediator act on the answer?
If the answer to any of these is no — replace the question.

Return ONLY valid JSON matching this exact structure:
{
    "questions": [
        {
            "question_id": "q_01",
            "question_text": "...",
            "directed_at": "requesting_party",
            "question_type": "open_ended",
            "purpose": "..."
        }
    ],
    "questionnaire_rationale": "..."
}

Return ONLY JSON. No explanation. No markdown.
"""


def generate_questionnaire(conflict: ConflictExtraction) -> QuestionnaireOutput | dict:
    """
    Run sub-system C on ConflictExtraction output.
    Returns QuestionnaireOutput on success.
    Returns failure dict on error — always check is_failed().
    """

    user_message = f"""
Generate a targeted questionnaire for this dispute:

Dispute Type: {conflict.dispute_type.value}
Core Dispute: {conflict.core_dispute}

Party A (Requesting Party) Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_a)}

Party B (Against Party) Claims:
{chr(10).join(f'- {claim}' for claim in conflict.claims_party_b)}

Disputed Facts:
{chr(10).join(f'- {fact}' for fact in conflict.disputed_facts)}

Undisputed Facts:
{chr(10).join(f'- {fact}' for fact in conflict.undisputed_facts) if conflict.undisputed_facts else 'None identified'}

Monetary Value: {f'INR {conflict.monetary_value}' if conflict.monetary_value else 'Not specified'}

Generate 8-10 specific questions that will help the mediator understand
both parties better and identify areas of potential agreement.
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
    from ai.subsystems.subsystem_e import get_cleaned_statement

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
    cleaned_a = get_cleaned_statement(party_a, "Party A")
    cleaned_b = get_cleaned_statement(party_b, "Party B")
    conflict = extract_conflict(cleaned_a, cleaned_b)

    if is_failed(conflict):
        print("Sub-system A failed:", conflict)
    else:
        print(f"Dispute type: {conflict.dispute_type}")
        print("\nRunning Sub-system C — Questionnaire Generation...")
        result = generate_questionnaire(conflict)

        if is_failed(result):
            print("FAILED:", result)
        else:
            print(f"\nSUCCESS! Generated {len(result.questions)} questions")
            print(f"\nRationale: {result.questionnaire_rationale}")
            print("\nQuestions:")
            for q in result.questions:
                print(f"\n  [{q.question_id}] → {q.directed_at} ({q.question_type})")
                print(f"  Q: {q.question_text}")
                print(f"  Purpose: {q.purpose}")