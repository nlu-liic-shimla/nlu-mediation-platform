# tests/test_subsystem_a.py
"""
Sub-system A — Full Test on All 8 Scenarios
Owner: Vaidant
Run: python tests/test_subsystem_a.py
"""

import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.subsystems.subsystem_a import extract_conflict
from ai.utils.ai_client import is_failed

# ── Scenario definitions ──────────────────────────────────────
SCENARIOS = [
    {"file": "S-01.json", "expected_type": "landlord_tenant"},
    {"file": "S-02.json", "expected_type": "commercial_contract"},
    {"file": "S-03.json", "expected_type": "employment"},
    {"file": "S-04.json", "expected_type": "consumer"},
    {"file": "S-05.json", "expected_type": "family_business"},
    {"file": "S-06.json", "expected_type": "property_boundary"},
    {"file": "S-07.json", "expected_type": "construction"},
    {"file": "S-08.json", "expected_type": "other"},
]

SCENARIOS_DIR = Path("tests/scenarios")


def run_tests():
    print("\n" + "="*60)
    print("SUB-SYSTEM A — ALL 8 SCENARIOS TEST")
    print("="*60)

    results = []
    passed = 0
    failed = 0

    for scenario in SCENARIOS:
        file_path = SCENARIOS_DIR / scenario["file"]

        # Load JSON
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        party_a = data["party_a_statement"]
        party_b = data["party_b_statement"]
        expected_type = data["expected"]["dispute_type"]
        expected_confidence_min = data["expected"]["extraction_confidence_min"]

        print(f"\n── {scenario['file']} ──────────────────────────────")
        print(f"   Description: {data['description']}")

        try:
            output = extract_conflict(party_a, party_b)

            if is_failed(output):
                # AI call failed
                print(f"   Status:     ❌ FAILED (AI error)")
                print(f"   Reason:     {output.get('reason', 'unknown')}")
                results.append({
                    "scenario": scenario["file"],
                    "description": data["description"],
                    "expected_type": expected_type,
                    "got_type": "FAILED",
                    "confidence": "N/A",
                    "confidence_pass": False,
                    "type_pass": False,
                    "status": "❌ AI FAILED"
                })
                failed += 1

            else:
                got_type = output.dispute_type
                confidence = output.extraction_confidence

                type_pass = (got_type == expected_type)
                confidence_pass = (confidence >= expected_confidence_min)
                overall_pass = type_pass and confidence_pass

                if overall_pass:
                    status = "✅ PASS"
                    passed += 1
                elif type_pass and not confidence_pass:
                    status = "⚠️  LOW CONFIDENCE"
                    failed += 1
                else:
                    status = "❌ WRONG TYPE"
                    failed += 1

                print(f"   Status:     {status}")
                print(f"   Type:       expected={expected_type} | got={got_type} | {'✅' if type_pass else '❌'}")
                print(f"   Confidence: got={confidence} | min={expected_confidence_min} | {'✅' if confidence_pass else '❌'}")
                print(f"   Core:       {output.core_dispute[:80]}...")

                results.append({
                    "scenario": scenario["file"],
                    "description": data["description"],
                    "expected_type": expected_type,
                    "got_type": got_type,
                    "confidence": confidence,
                    "confidence_pass": confidence_pass,
                    "type_pass": type_pass,
                    "status": status
                })

        except Exception as e:
            print(f"   Status:     ❌ EXCEPTION")
            print(f"   Error:      {e}")
            results.append({
                "scenario": scenario["file"],
                "description": data["description"],
                "expected_type": expected_type,
                "got_type": "EXCEPTION",
                "confidence": "N/A",
                "confidence_pass": False,
                "type_pass": False,
                "status": f"❌ EXCEPTION: {e}"
            })
            failed += 1

    # ── Print summary ─────────────────────────────────────────
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"  Passed:    {passed}/8")
    print(f"  Failed:    {failed}/8")
    print(f"  Pass rate: {int(passed/8*100)}%")

    print("\n── Results Table ────────────────────────────────────")
    print(f"{'Scenario':<10} {'Expected':<22} {'Got':<22} {'Conf':<6} {'Status'}")
    print("-"*75)
    for r in results:
        print(
            f"{r['scenario']:<10} "
            f"{r['expected_type']:<22} "
            f"{str(r['got_type']):<22} "
            f"{str(r['confidence']):<6} "
            f"{r['status']}"
        )

    # ── Save markdown report ──────────────────────────────────
    save_markdown(results, passed, failed)

    return results


def save_markdown(results, passed, failed):
    lines = []
    lines.append("# Sub-system A Test Results — Week 2")
    lines.append("**Tester:** Vaidant  ")
    lines.append(f"**Pass rate:** {passed}/8 ({int(passed/8*100)}%)  \n")

    lines.append("| Scenario | Description | Expected | Got | Confidence | Status |")
    lines.append("|---|---|---|---|---|---|")
    for r in results:
        lines.append(
            f"| {r['scenario']} "
            f"| {r['description']} "
            f"| {r['expected_type']} "
            f"| {r['got_type']} "
            f"| {r['confidence']} "
            f"| {r['status']} |"
        )

    lines.append("\n## Failures to fix in Week 3:")
    failures = [r for r in results if "PASS" not in r["status"]]
    if failures:
        for r in failures:
            lines.append(f"- **{r['scenario']}**: expected `{r['expected_type']}`, got `{r['got_type']}`")
    else:
        lines.append("- None! All scenarios passed ✅")

    output_path = Path("tests/week2_subsystem_a_results.md")
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n✅ Results saved to {output_path}")


if __name__ == "__main__":
    run_tests()