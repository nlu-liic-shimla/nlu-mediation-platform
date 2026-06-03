"""
subsystem_g.py
Sub-system G — Mediatability Score
Owner: Rishika (built by Vaidant as support)
Input: ConflictExtraction JSON
Output: MediatabilitySore (see schemas.py)

Scoring is DETERMINISTIC — Python code calculates the number.
Haiku call only writes the justification text.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, MediatabilitySore, MediatabilitBand
from ai.utils.ai_client import call_small, is_failed


def calculate_mediatability(conflict: ConflictExtraction) -> MediatabilitySore:
    """
    Calculate mediatability score for a conflict.
    Score is deterministic Python — no LLM for numbers.
    Haiku writes justification text only.
    """

    # ── Deterministic scoring ─────────────────────────────────
    score = 0

    # Factor 1: Monetary value (0-3 points)
    # Lower monetary value = easier to settle
    if conflict.monetary_value is None:
        score += 2  # no money = easier
    elif conflict.monetary_value < 100000:
        score += 3  # small amount
    elif conflict.monetary_value < 500000:
        score += 2  # medium amount
    elif conflict.monetary_value < 1000000:
        score += 1  # large amount
    else:
        score += 0  # very large = harder

    # Factor 2: Jurisdiction clear (0-2 points)
    if conflict.jurisdiction_clear:
        score += 2
    else:
        score += 0

    # Factor 3: Extraction confidence (0-2 points)
    if conflict.extraction_confidence >= 0.8:
        score += 2
    elif conflict.extraction_confidence >= 0.5:
        score += 1
    else:
        score += 0

    # Factor 4: Undisputed facts exist (0-2 points)
    if len(conflict.undisputed_facts) >= 2:
        score += 2
    elif len(conflict.undisputed_facts) == 1:
        score += 1
    else:
        score += 0

    # Factor 5: Dispute type suitability (0-1 point)
    suitable_types = [
        "landlord_tenant", "commercial_contract",
        "consumer", "employment", "construction"
    ]
    if conflict.dispute_type.value in suitable_types:
        score += 1

    # Total is out of 10 — normalize to 1-10
    final_score = max(1, min(10, score + 1))

    # ── Determine band ────────────────────────────────────────
    if final_score >= 7:
        band = MediatabilitBand.HIGH
    elif final_score >= 4:
        band = MediatabilitBand.MEDIUM
    else:
        band = MediatabilitBand.LOW

    # ── AI writes justification text only ────────────────────
    SYSTEM_PROMPT = """
You are a legal mediation expert. Based on the conflict details provided,
write a short justification (150-200 words) explaining why this dispute
is or is not suitable for mediation.

Focus on:
- The nature of the dispute
- The clarity of the facts
- The monetary value involved
- The likelihood of reaching a settlement

Be neutral and professional. Do not mention any score numbers.
Return ONLY the justification text. No headings. No bullet points.
"""

    user_message = f"""
Dispute type: {conflict.dispute_type.value}
Core dispute: {conflict.core_dispute}
Monetary value: {conflict.monetary_value} INR
Jurisdiction clear: {conflict.jurisdiction_clear}
Disputed facts count: {len(conflict.disputed_facts)}
Undisputed facts count: {len(conflict.undisputed_facts)}
Extraction confidence: {conflict.extraction_confidence}

Write the mediatability justification.
"""

    justification_result = call_small(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=None  # plain text response
    )

    # Handle plain text response
    if isinstance(justification_result, str):
        justification = justification_result
    elif is_failed(justification_result):
        justification = f"This dispute has a mediatability score of {final_score}/10 ({band.value} band). Based on the extracted conflict data, the dispute shows characteristics typical of cases that {('can benefit from' if final_score >= 5 else 'may face challenges in')} mediation."
    else:
        justification = str(justification_result)

    # ── Build positive and negative factors ───────────────────
    positive_factors = []
    negative_factors = []

    if conflict.jurisdiction_clear:
        positive_factors.append("Jurisdiction is clear — mediation can proceed without legal ambiguity")
    else:
        negative_factors.append("Jurisdiction unclear — parties may need legal advice first")

    if conflict.extraction_confidence >= 0.7:
        positive_factors.append("Both parties have provided clear and detailed statements")
    else:
        negative_factors.append("Statements are vague — mediator may need more information")

    if len(conflict.undisputed_facts) > 0:
        positive_factors.append(f"{len(conflict.undisputed_facts)} undisputed facts provide common ground")
    else:
        negative_factors.append("No common ground identified — parties disagree on all facts")

    if conflict.monetary_value and conflict.monetary_value < 500000:
        positive_factors.append("Monetary amount is within typical settlement range")
    elif conflict.monetary_value and conflict.monetary_value >= 500000:
        negative_factors.append("High monetary value may make settlement more difficult")

    if conflict.dispute_type.value in suitable_types:
        positive_factors.append(f"{conflict.dispute_type.value.replace('_', ' ').title()} disputes respond well to mediation")

    # Ensure at least one positive factor
    if not positive_factors:
        positive_factors.append("Dispute has been formally submitted by both parties")

    return MediatabilitySore(
        mediatability_score=final_score,
        mediatability_band=band,
        positive_factors=positive_factors[:5],
        negative_factors=negative_factors[:5],
        recommended_approach=f"Approach this {'straightforwardly' if final_score >= 7 else 'carefully'} — focus on {'finding common ground quickly' if final_score >= 7 else 'building trust before discussing settlement terms'}.",
        score_justification=justification
    )


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

    conflict = extract_conflict(party_a, party_b)
    result = calculate_mediatability(conflict)

    print(f"Score: {result.mediatability_score}/10")
    print(f"Band: {result.mediatability_band}")
    print(f"Positive factors: {result.positive_factors}")
    print(f"Negative factors: {result.negative_factors}")
    print(f"Justification: {result.score_justification[:200]}...")