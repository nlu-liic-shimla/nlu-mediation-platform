"""
pipeline_burst1.py
Burst 1 Pipeline — Complete
Owner: Vaidant (order fix confirmed by Rishika)

Pipeline order per master document Section 5.6:
  Step 1a: F on RAW statements (tone analysis)
  Step 1b: E on RAW Party A statement → cleaned_a
  Step 1b: E on RAW Party B statement → cleaned_b
  Step 2:  A on cleaned statements
  Step 3:  B on conflict extraction JSON
  Step 4:  G on conflict extraction JSON
"""

from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_a import extract_conflict
from ai.subsystems.subsystem_b import generate_neutral_summary
from ai.subsystems.subsystem_e import remove_bias_from_statement
from ai.subsystems.subsystem_f import analyse_tone
from ai.subsystems.subsystem_g import calculate_mediatability
from ai.schemas import Burst1Output
from ai.utils.ai_client import is_failed


def run_burst1_pipeline(
    party_a_statement: str,
    party_b_statement: str,
    case_id: str = "test"
) -> Burst1Output:
    """
    Run the full Burst 1 pipeline.
    Returns Burst1Output with completed steps listed.
    Never raises — failed steps set their field to None.
    """

    print("\n" + "=" * 60)
    print(f"BURST 1 PIPELINE — FULL")
    print(f"Case: {case_id}")
    print("=" * 60)

    output = Burst1Output()
    completed = []

    # ── Step 1a: Tone Analysis (F) on RAW text ────────────────
    # Must run on original — we want true emotional signal
    print("\n[Step 1a] Sub-system F — Tone Analysis on raw statements...")
    try:
        tone = analyse_tone(party_a_statement, party_b_statement)
        if is_failed(tone):
            print(f"  ❌ Failed: {tone.get('reason')}")
        else:
            print(f"  ✅ Party A hostility: {tone.party_a_tone.hostility_score}/10")
            print(f"  ✅ Party B hostility: {tone.party_b_tone.hostility_score}/10")
            output.tone_analysis = tone
            completed.append("tone_analysis")
    except Exception as e:
        print(f"  ❌ Exception in F: {e}")

    # ── Step 1b: Bias Removal (E) on RAW statements ───────────
    # Cleans emotional language before A extracts conflict
    # Each party stored separately in bias_removal_a / bias_removal_b
    print("\n[Step 1b] Sub-system E — Bias Removal on raw statements...")
    cleaned_a = party_a_statement  # fallback
    cleaned_b = party_b_statement  # fallback
    try:
        bias_a = remove_bias_from_statement(party_a_statement, "Party A")
        bias_b = remove_bias_from_statement(party_b_statement, "Party B")

        if not is_failed(bias_a):
            output.bias_removal_a = bias_a
            cleaned_a = bias_a.revised_summary or party_a_statement
            print(f"  ✅ Party A bias detected: {bias_a.bias_detected}")
        else:
            print(f"  ⚠️  Party A bias removal failed — using original")

        if not is_failed(bias_b):
            output.bias_removal_b = bias_b
            cleaned_b = bias_b.revised_summary or party_b_statement
            print(f"  ✅ Party B bias detected: {bias_b.bias_detected}")
        else:
            print(f"  ⚠️  Party B bias removal failed — using original")

        if not is_failed(bias_a) or not is_failed(bias_b):
            completed.append("bias_removal")

    except Exception as e:
        print(f"  ❌ Exception in E: {e}")

    # ── Step 2: Conflict Extraction (A) on CLEANED text ───────
    print("\n[Step 2] Sub-system A — Conflict Extraction on cleaned statements...")
    try:
        conflict = extract_conflict(cleaned_a, cleaned_b)
        if is_failed(conflict):
            print(f"  ❌ Failed: {conflict.get('reason')}")
            print("  ⚠️  Pipeline cannot continue without conflict extraction")
            output.completed_steps = completed
            return output
        else:
            print(f"  ✅ Dispute type: {conflict.dispute_type}")
            print(f"  ✅ Confidence: {conflict.extraction_confidence}")
            if conflict.extraction_confidence < 0.5:
                print(f"  ⚠️  Low confidence — mediator will see warning badge")
            output.conflict_extraction = conflict
            completed.append("conflict_extraction")
    except Exception as e:
        print(f"  ❌ Exception in A: {e}")
        output.completed_steps = completed
        return output

    # ── Step 3: Neutral Summary (B) on conflict JSON ──────────
    print("\n[Step 3] Sub-system B — Neutral Summary...")
    try:
        summary = generate_neutral_summary(output.conflict_extraction)
        if is_failed(summary):
            print(f"  ❌ Failed: {summary.get('reason')}")
        else:
            print(f"  ✅ Summary: {len(summary.summary)} chars")
            print(f"  ✅ Key issues: {len(summary.key_issues)}")
            output.neutral_summary = summary
            completed.append("neutral_summary")
    except Exception as e:
        print(f"  ❌ Exception in B: {e}")

    # ── Step 4: Mediatability Score (G) on conflict JSON ──────
    print("\n[Step 4] Sub-system G — Mediatability Score...")
    try:
        score = calculate_mediatability(output.conflict_extraction)
        if is_failed(score):
            print(f"  ❌ Failed: {score.get('reason')}")
        else:
            print(f"  ✅ Score: {score.mediatability_score}/10")
            print(f"  ✅ Band: {score.mediatability_band}")
            output.mediatability = score
            completed.append("mediatability")
    except Exception as e:
        print(f"  ❌ Exception in G: {e}")

    # ── Summary ───────────────────────────────────────────────
    output.completed_steps = completed

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    for step in ["tone_analysis", "bias_removal", "conflict_extraction",
                 "neutral_summary", "mediatability"]:
        icon = "✅" if step in completed else "❌"
        print(f"  {icon} {step}")
    print(f"\n  Total: {len(completed)}/5 steps completed")

    return output


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

    result = run_burst1_pipeline(party_a, party_b, case_id="S-01-test")

    print("\n── FINAL OUTPUT ──")
    print(f"tone_analysis:       {'✅' if result.tone_analysis else '❌'}")
    print(f"bias_removal_a:      {'✅' if result.bias_removal_a else '❌'}")
    print(f"bias_removal_b:      {'✅' if result.bias_removal_b else '❌'}")
    print(f"conflict_extraction: {'✅' if result.conflict_extraction else '❌'}")
    print(f"neutral_summary:     {'✅' if result.neutral_summary else '❌'}")
    print(f"mediatability:       {'✅' if result.mediatability else '❌'}")
