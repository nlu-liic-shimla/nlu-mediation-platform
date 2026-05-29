"""
pipeline_burst1.py
Burst 1 Pipeline Skeleton
Owner: Vaidant
Week 2 — skeleton only. Steps E and F wired.
Full pipeline (A, B, C, G) comes in Week 3.

Pipeline order:
Step 1: bias_removal (E) + tone_analysis (F) — run in parallel on RAW text
Step 2: conflict_extraction (A) — on bias-removed text
Step 3: neutral_summary (B) — on conflict extraction JSON
Step 4: mediatability_score (G) — on conflict extraction JSON

Week 2 scope: Steps E and F only.
Week 3 scope: Full pipeline A through G.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_e import remove_bias
from ai.subsystems.subsystem_f import analyse_tone
from ai.utils.ai_client import is_failed


def run_burst1_skeleton(party_a_statement: str, party_b_statement: str):
    """
    Week 2 skeleton — runs sub-systems E and F only.
    
    In Week 3 this function will be extended to run the full pipeline:
    E + F → A → B → G
    
    Returns a dict with results from each sub-system.
    Failed sub-systems return None — pipeline continues.
    """

    print("Starting Burst 1 pipeline skeleton...")
    results = {}

    # ── Step 1a: Bias Removal (Sub-system E) ──────────────────
    # Runs on RAW text — before any cleaning
    print("Running sub-system E (bias removal) on Party A...")
    bias_result_a = remove_bias_from_statement(party_a_statement, "Party A")
    results["bias_removal_a"] = bias_result_a

    print("Running sub-system E (bias removal) on Party B...")
    bias_result_b = remove_bias_from_statement(party_b_statement, "Party B")
    results["bias_removal_b"] = bias_result_b

    # ── Step 1b: Tone Analysis (Sub-system F) ─────────────────
    # Runs on RAW text — must be before bias removal
    print("Running sub-system F (tone analysis)...")
    tone_result = analyse_tone(party_a_statement, party_b_statement)
    if is_failed(tone_result):
        print(f"Sub-system F failed: {tone_result['reason']}")
        results["tone_analysis"] = None
    else:
        print("Sub-system F complete.")
        results["tone_analysis"] = tone_result

    # ── Week 3: Steps A, B, G will be added here ──────────────
    # Step 2: conflict_extraction on bias-removed text
    # Step 3: neutral_summary on conflict extraction JSON
    # Step 4: mediatability_score on conflict extraction JSON

    return results


def remove_bias_from_statement(statement: str, party_label: str):
    """
    Helper — runs bias removal on a single party statement.
    Returns BiasRemovalOutput or None on failure.
    """
    from ai.schemas import NeutralSummary
    from ai.utils.ai_client import call_small

    # For Week 2 — we run bias removal directly on the statement
    # In Week 3 — bias removal will run on NeutralSummary output
    BIAS_PROMPT = f"""
You are checking the following statement from {party_label} for biased or
emotional language. Remove bias and return a cleaned neutral version.
"""
    result = remove_bias_raw(statement, party_label)
    return result


def remove_bias_raw(statement: str, party_label: str):
    """
    Simplified bias removal for pipeline use.
    Takes raw statement text directly.
    """
    from ai.utils.ai_client import call_small, is_failed
    from pydantic import BaseModel
    from typing import List, Optional

    class SimpleBiasOutput(BaseModel):
        sanitised_text: str
        bias_detected: bool
        removals_count: int

    SYSTEM_PROMPT = f"""
You are a bias removal specialist for legal mediation.
Remove emotional language, personal attacks, and biased framing from this
{party_label} statement. Keep all facts intact.
Return ONLY valid JSON with these exact fields:
{{
    "sanitised_text": "cleaned version here",
    "bias_detected": true or false,
    "removals_count": number of changes made
}}
"""
    result = call_small(
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Clean this statement:\n{statement}",
        output_model=SimpleBiasOutput
    )

    if is_failed(result):
        print(f"Bias removal failed for {party_label}: {result['reason']}")
        return None

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

    results = run_burst1_skeleton(party_a, party_b)

    print("\n" + "="*50)
    print("BURST 1 PIPELINE RESULTS")
    print("="*50)

    if results["bias_removal_a"]:
        print(f"\nParty A — Bias detected: {results['bias_removal_a'].bias_detected}")
        print(f"Party A — Changes made: {results['bias_removal_a'].removals_count}")
        print(f"Party A — Cleaned text: {results['bias_removal_a'].sanitised_text[:200]}...")

    if results["bias_removal_b"]:
        print(f"\nParty B — Bias detected: {results['bias_removal_b'].bias_detected}")
        print(f"Party B — Changes made: {results['bias_removal_b'].removals_count}")
        print(f"Party B — Cleaned text: {results['bias_removal_b'].sanitised_text[:200]}...")

    if results["tone_analysis"]:
        print(f"\nParty A tone: {results['tone_analysis'].party_a_tone.tone_category}")
        print(f"Party A hostility: {results['tone_analysis'].party_a_tone.hostility_score}/10")
        print(f"Party B tone: {results['tone_analysis'].party_b_tone.tone_category}")
        print(f"Party B hostility: {results['tone_analysis'].party_b_tone.hostility_score}/10")
        print(f"Combined intensity: {results['tone_analysis'].combined_conflict_intensity}/10")
        print(f"Mediator advisory: {results['tone_analysis'].mediator_advisory}")

    print("\nBurst 1 skeleton complete!")
    print("Week 3: Add sub-systems A, B, G to complete the full pipeline.")