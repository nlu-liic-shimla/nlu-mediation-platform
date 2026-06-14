# tests/test_burst1_pipeline.py
"""
Full Burst 1 Pipeline — All 8 Scenarios Test
Owner: Vaidant
Run: python -m tests.test_burst1_pipeline
"""

import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.pipeline_burst1 import run_burst1_pipeline

SCENARIOS_DIR = Path("tests/scenarios")

SCENARIOS = [
    "S-01.json", "S-02.json", "S-03.json", "S-04.json",
    "S-05.json", "S-06.json", "S-07.json", "S-08.json"
]

def run_all():
    print("\n" + "="*60)
    print("BURST 1 PIPELINE — ALL 8 SCENARIOS")
    print("="*60)

    results = []
    total_passed = 0
    total_failed = 0

    for fname in SCENARIOS:
        with open(SCENARIOS_DIR / fname, encoding="utf-8") as f:
            data = json.load(f)

        print(f"\n── {fname} — {data['description']}")

        result = run_burst1_pipeline(
            data["party_a_statement"],
            data["party_b_statement"],
            case_id=data["id"]
        )

        steps_done = len(result.completed_steps)
        passed = steps_done == 5
        status = "✅ PASS" if passed else f"⚠️  {steps_done}/5 steps"

        if passed:
            total_passed += 1
        else:
            total_failed += 1

        print(f"  Result: {status}")

        results.append({
            "scenario": fname,
            "description": data["description"],
            "steps_completed": steps_done,
            "completed": result.completed_steps,
            "dispute_type": str(result.conflict_extraction.dispute_type) if result.conflict_extraction else "FAILED",
            "confidence": result.conflict_extraction.extraction_confidence if result.conflict_extraction else "N/A",
            "mediatability": result.mediatability.mediatability_score if result.mediatability else "N/A",
            "status": status
        })

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"  Passed: {total_passed}/8")
    print(f"  Failed: {total_failed}/8")

    print(f"\n{'Scenario':<12} {'Dispute Type':<25} {'Conf':<6} {'Score':<6} {'Status'}")
    print("-"*70)
    for r in results:
        print(f"{r['scenario']:<12} {str(r['dispute_type']):<25} {str(r['confidence']):<6} {str(r['mediatability']):<6} {r['status']}")

    # ── Save markdown ─────────────────────────────────────────
    lines = ["# Burst 1 Pipeline Results — Week 3\n"]
    lines.append(f"**Pass rate: {total_passed}/8**\n")
    lines.append("| Scenario | Description | Dispute Type | Confidence | Score | Steps | Status |")
    lines.append("|---|---|---|---|---|---|---|")
    for r in results:
        lines.append(
            f"| {r['scenario']} | {r['description']} | {r['dispute_type']} "
            f"| {r['confidence']} | {r['mediatability']} | {r['steps_completed']}/5 | {r['status']} |"
        )

    Path("tests/week3_burst1_results.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    print("\n✅ Results saved to tests/week3_burst1_results.md")

if __name__ == "__main__":
    run_all()