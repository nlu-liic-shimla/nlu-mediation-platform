"""
subsystem_g.py
Sub-system G — Mediatability Score
Owner: Rishika (built by Vaidant as support)
Input: ConflictExtraction JSON
Output: MediatabilitySore (see schemas.py)

Scoring is DETERMINISTIC — Python code calculates the number.
Groq call only writes the justification text.

Scoring redesign (v2):
  Old formula gave 9-10 to almost every case because positive factors
  stacked without any counterbalancing penalties.

  New formula uses a 0-10 scale built from both positive and negative
  factors so scores spread realistically across High / Medium / Low.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ConflictExtraction, MediatabilitySore, MediatabilitBand
from ai.utils.ai_client import is_failed


def calculate_mediatability(conflict: ConflictExtraction) -> MediatabilitySore:
    """
    Calculate mediatability score for a conflict.
    Score is deterministic Python — no LLM for numbers.
    Groq writes justification text only.
    """

    score = 0  # starts at 0, max possible = 10, min possible = 0

    # ── POSITIVE FACTORS (add points) ────────────────────────

    # Factor 1: Dispute type suitability (0-2 points)
    # High suitability types — well-established mediation track record
    high_suitability = ["landlord_tenant", "consumer", "commercial_contract"]
    # Medium suitability types — mediatable but more complex
    medium_suitability = ["employment", "construction", "debt_recovery"]
    # Low suitability — property_boundary, family_business, other get 0

    if conflict.dispute_type.value in high_suitability:
        score += 2
    elif conflict.dispute_type.value in medium_suitability:
        score += 1
    else:
        score += 0  # property_boundary, family_business, other

    # Factor 2: Extraction confidence (0-2 points)
    # High confidence = facts are clear = easier to mediate
    if conflict.extraction_confidence >= 0.8:
        score += 2
    elif conflict.extraction_confidence >= 0.6:
        score += 1
    else:
        score += 0

    # Factor 3: Undisputed facts (0-2 points)
    # Common ground = foundation for settlement
    if len(conflict.undisputed_facts) >= 3:
        score += 2
    elif len(conflict.undisputed_facts) >= 1:
        score += 1
    else:
        score += 0

    # Factor 4: Jurisdiction clear (0-1 point)
    # Reduced from 2 to 1 — jurisdiction is a threshold requirement,
    # not a strong positive signal for settlement likelihood
    if conflict.jurisdiction_clear:
        score += 1
    else:
        score += 0

    # ── NEGATIVE FACTORS (subtract points) ───────────────────

    # Factor 5: Monetary value penalty (0 to -2 points)
    # Very high stakes disputes are harder to settle
    if conflict.monetary_value is None:
        score += 0   # unknown = no penalty
    elif conflict.monetary_value < 100000:
        score += 0   # small — no penalty
    elif conflict.monetary_value < 500000:
        score += 0   # medium — no penalty
    elif conflict.monetary_value < 2000000:
        score -= 1   # large — harder to settle
    else:
        score -= 2   # very large — significantly harder

    # Factor 6: Disputed facts complexity penalty (0 to -2 points)
    # Many disputed facts = more contentious = harder to settle
    if len(conflict.disputed_facts) <= 1:
        score += 0   # simple — no penalty
    elif len(conflict.disputed_facts) <= 3:
        score -= 1   # moderate complexity
    else:
        score -= 2   # high complexity

    # Factor 7: Low confidence penalty (0 to -1 point)
    # Very vague statements make mediation harder
    if conflict.extraction_confidence < 0.4:
        score -= 1

    # ── Normalize to 1-10 ─────────────────────────────────────
    # Raw score range: -5 to +7
    # Map to 1-10: shift by 5, scale to fit
    # We add 4 as baseline so a neutral case (score=0) lands at ~4 (Medium)
    final_score = max(1, min(10, score + 4))

    # ── Determine band ────────────────────────────────────────
    if final_score >= 7:
        band = MediatabilitBand.HIGH
    elif final_score >= 4:
        band = MediatabilitBand.MEDIUM
    else:
        band = MediatabilitBand.LOW

    # ── Suitable types list (reused below for factors) ────────
    suitable_types = high_suitability + medium_suitability

    # ── AI writes justification text only ────────────────────
    SYSTEM_PROMPT = """
You are a legal mediation expert. Based on the conflict details provided,
write a short justification (50-60 words, strictly under 380 characters)
explaining why this dispute is or is not suitable for mediation.

Focus on the nature of the dispute, clarity of facts, and likelihood of settlement.
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

    # ── Groq call for plain text justification ────────────────
    try:
        from groq import Groq
        import os
        client = Groq(api_key=os.environ["GROQ_API_KEY"])
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            max_tokens=100,
            temperature=0.1,
        )
        justification = response.choices[0].message.content.strip()
    except Exception:
        justification = (
            f"Based on the conflict data, this case "
            f"{'is well-suited for' if final_score >= 7 else 'may benefit from' if final_score >= 4 else 'faces challenges in'} "
            f"mediation. The {conflict.dispute_type.value.replace('_', ' ')} dispute "
            f"has {len(conflict.undisputed_facts)} undisputed facts and "
            f"{len(conflict.disputed_facts)} disputed facts."
        )

    # Hard truncate — schema allows max 400 chars
    if len(justification) > 397:
        justification = justification[:397] + "..."

    # ── Build positive and negative factors ───────────────────
    positive_factors = []
    negative_factors = []

    if conflict.jurisdiction_clear:
        positive_factors.append("Jurisdiction is clear — mediation can proceed without legal ambiguity")
    else:
        negative_factors.append("Jurisdiction unclear — parties may need legal advice first")

    if conflict.extraction_confidence >= 0.7:
        positive_factors.append("Both parties have provided clear and detailed statements")
    elif conflict.extraction_confidence < 0.4:
        negative_factors.append("Statements are vague — mediator may need more information")

    if len(conflict.undisputed_facts) >= 2:
        positive_factors.append(f"{len(conflict.undisputed_facts)} undisputed facts provide a foundation for agreement")
    elif len(conflict.undisputed_facts) == 1:
        positive_factors.append("At least one undisputed fact provides a starting point")
    else:
        negative_factors.append("No common ground identified — parties disagree on all facts")

    if len(conflict.disputed_facts) > 3:
        negative_factors.append(f"{len(conflict.disputed_facts)} disputed facts indicate high complexity")
    elif len(conflict.disputed_facts) <= 2:
        positive_factors.append("Limited number of disputed facts — focused negotiation is possible")

    if conflict.monetary_value and conflict.monetary_value >= 2000000:
        negative_factors.append("Very high monetary value significantly increases settlement difficulty")
    elif conflict.monetary_value and conflict.monetary_value >= 500000:
        negative_factors.append("High monetary value may make settlement more difficult")
    elif conflict.monetary_value and conflict.monetary_value < 500000:
        positive_factors.append("Monetary amount is within typical settlement range")
    elif conflict.monetary_value is None:
        negative_factors.append("Monetary value unclear — may complicate settlement discussions")

    if conflict.dispute_type.value in high_suitability:
        positive_factors.append(
            f"{conflict.dispute_type.value.replace('_', ' ').title()} disputes have a strong track record in mediation"
        )
    elif conflict.dispute_type.value in medium_suitability:
        positive_factors.append(
            f"{conflict.dispute_type.value.replace('_', ' ').title()} disputes can be resolved through mediation with careful facilitation"
        )
    else:
        negative_factors.append(
            f"{conflict.dispute_type.value.replace('_', ' ').title()} disputes are more complex and may require specialised mediation"
        )

    if not positive_factors:
        positive_factors.append("Dispute has been formally submitted — both parties are engaged")

    return MediatabilitySore(
        mediatability_score=final_score,
        mediatability_band=band,
        positive_factors=positive_factors[:5],
        negative_factors=negative_factors[:5],
        recommended_approach=(
            f"Approach this {'straightforwardly' if final_score >= 7 else 'carefully'} — "
            f"focus on {'identifying the key monetary gap and bridging it quickly' if final_score >= 7 else 'building rapport and establishing agreed facts before moving to positions' if final_score >= 4 else 'clarifying the facts and jurisdiction before attempting any settlement discussion'}."
        ),
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
    print(f"Band:  {result.mediatability_band.value}")
    print(f"Positive: {result.positive_factors}")
    print(f"Negative: {result.negative_factors}")
    print(f"Approach: {result.recommended_approach}")
    print(f"Justification: {result.score_justification}")
