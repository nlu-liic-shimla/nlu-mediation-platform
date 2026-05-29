"""
subsystem_f.py
Sub-system F — Tone Analysis
Owner: Rishika (written by Vaidant as support)
Input: raw party statements
Output: ToneAnalysis (see schemas.py)

Runs on RAW statements BEFORE bias removal.
We want the true emotional signal — not the cleaned version.
Mediator only — never shown to parties.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.schemas import ToneAnalysis
from ai.utils.ai_client import call_small, is_failed

SYSTEM_PROMPT = """
You are a dispute resolution psychologist analysing the emotional tone
of legal dispute statements to help mediators understand each party's
state of mind before mediation begins.

You will receive two raw party statements.
Analyse the tone of each statement independently.

SCORING DIMENSIONS:
- hostility (1-10): 1=completely calm, 10=extremely aggressive
- openness_score (1-10): 1=completely closed to resolution, 10=very open
- combined_conflict_intensity (1-10): overall intensity of both parties together

TONE CATEGORIES:
- hostile: aggressive, threatening language
- adversarial: confrontational but not threatening
- neutral: factual, unemotional
- cooperative: willing to work together
- conciliatory: actively seeking resolution

RULES:
1. Score based on HOW they say things not WHAT they say
2. A party can have legitimate grievances and still have low hostility
3. key_emotional_phrases: maximum 5 phrases that best show the tone
4. mediator_advisory: practical advice for the mediator on how to approach the session
5. This output is MEDIATOR ONLY — never shown to parties

Return ONLY valid JSON in this EXACT format — field names must match exactly:
{
    "party_a_tone": {
        "tone_category": "neutral",
        "hostility_score": 5,
        "openness_score": 5,
        "key_emotional_phrases": ["phrase1", "phrase2"],
        "tone_summary": "one sentence summary"
    },
    "party_b_tone": {
        "tone_category": "neutral",
        "hostility_score": 5,
        "openness_score": 5,
        "key_emotional_phrases": ["phrase1", "phrase2"],
        "tone_summary": "one sentence summary"
    },
    "combined_conflict_intensity": 5,
    "mediator_advisory": "advice for mediator here"
}
"""

def analyse_tone(party_a_statement: str, party_b_statement: str):
    """
    Run sub-system F on raw party statements.
    Must run on ORIGINAL text before bias removal.
    Returns ToneAnalysis on success.
    Returns failure dict on error — always check is_failed().
    """

    user_message = f"""
Analyse the emotional tone of these two raw dispute statements:

PARTY A STATEMENT (raw):
{party_a_statement}

PARTY B STATEMENT (raw):
{party_b_statement}

Analyse the tone of each party independently and provide
a combined conflict intensity score and mediator advisory.
"""

    result = call_small(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        output_model=ToneAnalysis
    )

    return result


# ── Quick test ────────────────────────────────────────────────
if __name__ == "__main__":
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

    print("Running sub-system F tone analysis...")
    result = analyse_tone(party_a, party_b)

    if is_failed(result):
        print("FAILED:", result)
    else:
        print("\nSUCCESS!")
        print("\nPARTY A TONE:")
        print(f"  Category: {result.party_a_tone.tone_category}")
        print(f"  Hostility: {result.party_a_tone.hostility_score}/10")
        print(f"  Openness: {result.party_a_tone.openness_score}/10")
        print(f"  Key phrases: {result.party_a_tone.key_emotional_phrases}")
        print(f"  Summary: {result.party_a_tone.tone_summary}")
        print("\nPARTY B TONE:")
        print(f"  Category: {result.party_b_tone.tone_category}")
        print(f"  Hostility: {result.party_b_tone.hostility_score}/10")
        print(f"  Openness: {result.party_b_tone.openness_score}/10")
        print(f"  Key phrases: {result.party_b_tone.key_emotional_phrases}")
        print(f"  Summary: {result.party_b_tone.tone_summary}")
        print(f"\nCOMBINED CONFLICT INTENSITY: {result.combined_conflict_intensity}/10")
        print(f"\nMEDIATOR ADVISORY: {result.mediator_advisory}")