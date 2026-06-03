"""
pipeline_burst1.py
Burst 1 Pipeline — Complete
Owner: Vaidant
Week 3 — all 5 steps wired

Pipeline order (per master doc Section 5.6):
  Step 1 parallel: F (tone analysis) + E (bias removal) on RAW text
  Step 2: A (conflict extraction) on bias-removed text
  Step 3: B (neutral summary) on conflict extraction JSON
  Step 4: G (mediatability score) on conflict extraction JSON
"""

from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_a import extract_conflict
from ai.subsystems.subsystem_b import generate_neutral_summary
from ai.subsystems.subsystem_e import remove_bias
from ai.subsystems.subsystem_f import analyse_tone
from ai.subsystems.subsystem_g import calculate_mediatability
from ai.schemas import Burst1Output
from ai.utils.ai_client import is_failed


def run_burst1_pipeline(
    party_a_statement: str,
    party_b_statement: str,
    case_id: str = "test"
) -> Burst1Output:

    print("\n" + "="*60)
    print(f"BURST 1 PIPELINE — FULL")
    print(f"Case: {case_id}")
    print("="*60)

    output = Burst1Output()
    completed = []

    # ── Step 1: Tone Analysis (F) — on RAW text ───────────────
    print("\n[Step 1] Sub-system F — Tone Analysis...")
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
        print(f"  ❌ Exception: {e}")

    # ── Step 2: Conflict Extraction (A) ───────────────────────
    print("\n[Step 2] Sub-system A — Conflict Extraction...")
    try:
        conflict = extract_conflict(party_a_statement, party_b_statement)
        if is_failed(conflict):
            print(f"  ❌ Failed: {conflict.get('reason')}")
        else:
            print(f"  ✅ Dispute type: {conflict.dispute_type}")
            print(f"  ✅ Confidence: {conflict.extraction_confidence}")
            output.conflict_extraction = conflict
            completed.append("conflict_extraction")
    except Exception as e:
        print(f"  ❌ Exception: {e}")

    # ── Step 3: Neutral Summary (B) ───────────────────────────
    print("\n[Step 3] Sub-system B — Neutral Summary...")
    if output.conflict_extraction:
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
            print(f"  ❌ Exception: {e}")
    else:
        print("  ⏭️  Skipped — conflict extraction failed")

    # ── Step 4: Bias Removal (E) — on neutral summary ─────────
    print("\n[Step 4] Sub-system E — Bias Removal on Summary...")
    if output.neutral_summary:
        try:
            bias = remove_bias(output.neutral_summary)
            if is_failed(bias):
                print(f"  ❌ Failed: {bias.get('reason')}")
            else:
                print(f"  ✅ Bias detected: {bias.bias_detected}")
                print(f"  ✅ Bias check passed: {bias.bias_check_passed}")
                output.bias_removal_a = bias
                completed.append("bias_removal")
        except Exception as e:
            print(f"  ❌ Exception: {e}")
    else:
        print("  ⏭️  Skipped — neutral summary failed")

    # ── Step 5: Mediatability Score (G) ───────────────────────
    print("\n[Step 5] Sub-system G — Mediatability Score...")
    if output.conflict_extraction:
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
            print(f"  ❌ Exception: {e}")
    else:
        print("  ⏭️  Skipped — conflict extraction failed")

    # ── Summary ───────────────────────────────────────────────
    output.completed_steps = completed

    print("\n" + "="*60)
    print("PIPELINE COMPLETE")
    print("="*60)
    for step in ['tone_analysis', 'conflict_extraction', 'neutral_summary',
                 'bias_removal', 'mediatability']:
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
    print(f"conflict_extraction: {'✅' if result.conflict_extraction else '❌'}")
    print(f"neutral_summary:     {'✅' if result.neutral_summary else '❌'}")
    print(f"bias_removal:        {'✅' if result.bias_removal_a else '❌'}")
    print(f"mediatability:       {'✅' if result.mediatability else '❌'}")