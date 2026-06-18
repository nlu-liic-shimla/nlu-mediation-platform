"""
pipeline_burst2.py
Burst 2 Pipeline — Complete
Owner: Vaidant
Week 4

Triggered automatically when both parties submit questionnaire responses.

Pipeline order:
  Input: ConflictExtraction (from Burst 1) + questionnaire responses
  Step 1: Sub-system D — BATNA/WATNA scoring
  Output: BatnaWatnaOutput saved to ai_analysis table (burst_number=2)

Per master document Section 5.6:
  Burst 2 runs ONLY after QUESTIONNAIRE_COMPLETE state is reached.
  ConflictExtraction from Burst 1 is reused — not re-extracted.
  Questionnaire responses are passed as structured dict.
"""

from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_d import generate_batna_watna
from ai.schemas import ConflictExtraction, BatnaWatnaOutput
from ai.utils.ai_client import is_failed


def run_burst2_pipeline(
    conflict: ConflictExtraction,
    questionnaire_responses: dict,
    case_id: str = "test"
) -> dict:
    """
    Full Burst 2 pipeline.

    Parameters:
        conflict              — ConflictExtraction from Burst 1 ai_analysis record
        questionnaire_responses — { party_a: {q_id: answer}, party_b: {q_id: answer} }
        case_id               — for logging only

    Returns dict with keys:
        batna_watna      — BatnaWatnaOutput or None
        completed_steps  — list of step names that succeeded
        failed_steps     — list of step names that failed

    Never raises — all failures are caught and logged.
    Always check result['batna_watna'] is not None before using.
    """

    print("\n" + "="*60)
    print(f"BURST 2 PIPELINE — BATNA/WATNA")
    print(f"Case: {case_id}")
    print("="*60)

    result = {
        "batna_watna": None,
        "completed_steps": [],
        "failed_steps": []
    }

    # ── Step 1: BATNA/WATNA (Sub-system D) ───────────────────
    # Input: ConflictExtraction + questionnaire responses
    # Output: BatnaWatnaOutput with scores for both parties
    print("\n[Step 1] Sub-system D — BATNA/WATNA Scoring...")
    try:
        batna = generate_batna_watna(conflict, questionnaire_responses)

        if is_failed(batna):
            print(f"  ❌ Failed: {batna.get('reason')}")
            result["failed_steps"].append("batna_watna")
        else:
            # Verify BATNA invariant holds (batna_score >= watna_score)
            a_ok = batna.party_a.batna_score >= batna.party_a.watna_score
            b_ok = batna.party_b.batna_score >= batna.party_b.watna_score

            print(f"  ✅ Party A BATNA: {batna.party_a.batna_label} ({batna.party_a.batna_score}/10)")
            print(f"  ✅ Party A WATNA: {batna.party_a.watna_label} ({batna.party_a.watna_score}/10)")
            print(f"  ✅ Party A invariant (BATNA>=WATNA): {'✅' if a_ok else '❌'}")
            print(f"  ✅ Party B BATNA: {batna.party_b.batna_label} ({batna.party_b.batna_score}/10)")
            print(f"  ✅ Party B WATNA: {batna.party_b.watna_label} ({batna.party_b.watna_score}/10)")
            print(f"  ✅ Party B invariant (BATNA>=WATNA): {'✅' if b_ok else '❌'}")
            print(f"  ✅ Settlement zone: {str(batna.overall_settlement_zone)[:80]}...")

            result["batna_watna"] = batna
            result["completed_steps"].append("batna_watna")

    except Exception as e:
        print(f"  ❌ Exception: {e}")
        result["failed_steps"].append("batna_watna")

    # ── Pipeline summary ──────────────────────────────────────
    print("\n" + "="*60)
    print("BURST 2 COMPLETE")
    print("="*60)
    icon = "✅" if "batna_watna" in result["completed_steps"] else "❌"
    print(f"  {icon} batna_watna")
    print(f"\n  Steps: {len(result['completed_steps'])}/1 completed")

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

    # Simulate questionnaire responses
    questionnaire_responses = {
        "party_a": {
            "q_01": "Yes I gave 30 days written notice via WhatsApp",
            "q_02": "I have photos and videos from move-out day",
            "q_03": "I sent 3 written requests over 3 months",
            "q_04": "I want full deposit returned — 50000 INR"
        },
        "party_b": {
            "q_01": "The tenant left 2 days late without notice",
            "q_02": "I have repair invoices totalling 45000 INR",
            "q_03": "The damage was not present before tenant moved in",
            "q_04": "I am willing to return 5000 INR after deductions"
        }
    }

    print("Running Sub-system A first...")
    conflict = extract_conflict(party_a, party_b)

    if is_failed(conflict):
        print("Sub-system A failed:", conflict)
    else:
        print("Sub-system A done. Running Burst 2...")
        result = run_burst2_pipeline(
            conflict,
            questionnaire_responses,
            case_id="S-01-test"
        )

        print("\n── FINAL OUTPUT ──")
        print(f"batna_watna: {'✅' if result['batna_watna'] else '❌'}")

        if result["batna_watna"]:
            bw = result["batna_watna"]
            print(f"\nParty A: BATNA={bw.party_a.batna_label} ({bw.party_a.batna_score}/10) | WATNA={bw.party_a.watna_label} ({bw.party_a.watna_score}/10)")
            print(f"Party B: BATNA={bw.party_b.batna_label} ({bw.party_b.batna_score}/10) | WATNA={bw.party_b.watna_label} ({bw.party_b.watna_score}/10)")
            print(f"\nSettlement zone: {bw.overall_settlement_zone}")
            print(f"\nDisclaimer: {bw.disclaimer}")