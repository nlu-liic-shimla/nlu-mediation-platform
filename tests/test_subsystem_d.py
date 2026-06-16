# tests/test_subsystem_d.py
"""
Sub-system D — BATNA/WATNA Test on All 8 Scenarios
Owner: Vaidant
Run: python -m tests.test_subsystem_d
"""

import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_a import extract_conflict
from ai.subsystems.subsystem_d import generate_batna_watna
from ai.utils.ai_client import is_failed

SCENARIOS_DIR = Path("tests/scenarios")

SCENARIOS = [
    "S-01.json", "S-02.json", "S-03.json", "S-04.json",
    "S-05.json", "S-06.json", "S-07.json", "S-08.json"
]


def run_all():
    print("\n" + "="*60)
    print("SUB-SYSTEM D — BATNA/WATNA — ALL 8 SCENARIOS")
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
                "a_batna": "N/A", "a_watna": "N/A",
                "b_batna": "N/A", "b_watna": "N/A",
                "invariant_a": False, "invariant_b": False
            })
            continue

        # Step 2: Run Sub-system D
        result = generate_batna_watna(conflict)

        if is_failed(result):
            print(f"  ❌ Sub-system D failed: {result.get('reason')}")
            failed += 1
            results.append({
                "scenario": fname,
                "status": "❌ D FAILED",
                "a_batna": "N/A", "a_watna": "N/A",
                "b_batna": "N/A", "b_watna": "N/A",
                "invariant_a": False, "invariant_b": False
            })
            continue

        # Check BATNA invariant
        invariant_a = result.party_a.batna_score >= result.party_a.watna_score
        invariant_b = result.party_b.batna_score >= result.party_b.watna_score
        both_invariants = invariant_a and invariant_b

        if both_invariants:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ INVARIANT BROKEN"
            failed += 1

        print(f"  Status: {status}")
        print(f"  Party A: BATNA={result.party_a.batna_label}({result.party_a.batna_score}) WATNA={result.party_a.watna_label}({result.party_a.watna_score}) invariant={'✅' if invariant_a else '❌'}")
        print(f"  Party B: BATNA={result.party_b.batna_label}({result.party_b.batna_score}) WATNA={result.party_b.watna_label}({result.party_b.watna_score}) invariant={'✅' if invariant_b else '❌'}")
        print(f"  Settlement zone: {str(result.overall_settlement_zone)[:80]}...")

        results.append({
            "scenario": fname,
            "status": status,
            "a_batna": f"{result.party_a.batna_label}({result.party_a.batna_score})",
            "a_watna": f"{result.party_a.watna_label}({result.party_a.watna_score})",
            "b_batna": f"{result.party_b.batna_label}({result.party_b.batna_score})",
            "b_watna": f"{result.party_b.watna_label}({result.party_b.watna_score})",
            "invariant_a": invariant_a,
            "invariant_b": invariant_b
        })

    # ── Final summary ─────────────────────────────────────────
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"  Passed: {passed}/8")
    print(f"  Failed: {failed}/8")

    print(f"\n{'Scenario':<12} {'Party A BATNA':<20} {'Party A WATNA':<20} {'Party B BATNA':<20} {'Party B WATNA':<20} {'Status'}")
    print("-"*100)
    for r in results:
        print(f"{r['scenario']:<12} {str(r['a_batna']):<20} {str(r['a_watna']):<20} {str(r['b_batna']):<20} {str(r['b_watna']):<20} {r['status']}")

    # ── Save markdown ─────────────────────────────────────────
    lines = ["# Sub-system D Test Results — Week 4\n"]
    lines.append(f"**Pass rate: {passed}/8**\n")
    lines.append("| Scenario | Party A BATNA | Party A WATNA | Party B BATNA | Party B WATNA | Status |")
    lines.append("|---|---|---|---|---|---|")
    for r in results:
        lines.append(
            f"| {r['scenario']} | {r['a_batna']} | {r['a_watna']} "
            f"| {r['b_batna']} | {r['b_watna']} | {r['status']} |"
        )

    Path("tests/week4_subsystem_d_results.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    print("\n✅ Results saved to tests/week4_subsystem_d_results.md")


if __name__ == "__main__":
    run_all()