# tests/test_subsystem_c.py
"""
Sub-system C — Questionnaire Generation Test
Owner: Vaidant
Run: python -m tests.test_subsystem_c
"""

import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_a import extract_conflict
from ai.subsystems.subsystem_c import generate_questionnaire
from ai.utils.ai_client import is_failed

SCENARIOS_DIR = Path("tests/scenarios")
SCENARIOS = [
    "S-01.json", "S-02.json", "S-03.json", "S-04.json",
    "S-05.json", "S-06.json", "S-07.json", "S-08.json"
]


def run_all():
    print("\n" + "="*60)
    print("SUB-SYSTEM C — QUESTIONNAIRE — ALL 8 SCENARIOS")
    print("="*60)

    results = []
    passed = 0
    failed = 0

    for fname in SCENARIOS:
        with open(SCENARIOS_DIR / fname, encoding="utf-8") as f:
            data = json.load(f)

        print(f"\n── {fname} — {data['description']}")

        # Step 1: Run Sub-system A first
        conflict = extract_conflict(
            data["party_a_statement"],
            data["party_b_statement"]
        )

        if is_failed(conflict):
            print(f"  ❌ Sub-system A failed — skipping")
            failed += 1
            results.append({
                "scenario": fname,
                "status": "❌ A FAILED",
                "questions": 0,
                "dispute_specific": False
            })
            continue

        # Step 2: Run Sub-system C
        result = generate_questionnaire(conflict)

        if is_failed(result):
            print(f"  ❌ Sub-system C failed: {result.get('reason')}")
            failed += 1
            results.append({
                "scenario": fname,
                "status": "❌ C FAILED",
                "questions": 0,
                "dispute_specific": False
            })
            continue

        # Check question count
        q_count = len(result.questions)
        count_ok = 8 <= q_count <= 12

        # Check questions are dispute specific (not all directed at "both")
        both_count = sum(1 for q in result.questions if q.directed_at == "both")
        dispute_specific = both_count < q_count  # at least some targeted questions

        if count_ok and dispute_specific:
            status = "✅ PASS"
            passed += 1
        elif count_ok:
            status = "⚠️  GENERIC"
            failed += 1
        else:
            status = "❌ WRONG COUNT"
            failed += 1

        print(f"  Status: {status}")
        print(f"  Questions: {q_count} (need 8-12)")
        print(f"  Dispute type: {conflict.dispute_type}")
        print(f"  Rationale: {result.questionnaire_rationale[:80]}...")
        print(f"  Sample Q: {result.questions[0].question_text[:80]}...")

        results.append({
            "scenario": fname,
            "status": status,
            "questions": q_count,
            "dispute_specific": dispute_specific
        })

    # ── Final summary ─────────────────────────────────────────
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"  Passed: {passed}/8")
    print(f"  Failed: {failed}/8")

    print(f"\n{'Scenario':<12} {'Questions':<12} {'Dispute Specific':<18} {'Status'}")
    print("-"*60)
    for r in results:
        print(f"{r['scenario']:<12} {str(r['questions']):<12} {str(r['dispute_specific']):<18} {r['status']}")

    # Save results
    lines = ["# Sub-system C Test Results — Week 4\n"]
    lines.append(f"**Pass rate: {passed}/8**\n")
    lines.append("| Scenario | Questions | Dispute Specific | Status |")
    lines.append("|---|---|---|---|")
    for r in results:
        lines.append(f"| {r['scenario']} | {r['questions']} | {r['dispute_specific']} | {r['status']} |")

    Path("tests/week4_subsystem_c_results.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    print("\n✅ Results saved to tests/week4_subsystem_c_results.md")


if __name__ == "__main__":
    run_all()