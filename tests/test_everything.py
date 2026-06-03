# tests/test_everything.py
"""
Master Test Script — Tests everything
Run: python -m tests.test_everything
"""

import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.utils.ai_client import is_failed

SCENARIOS_DIR = Path("tests/scenarios")
total_passed = 0
total_failed = 0


def header(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)


def check(label, passed, detail=""):
    global total_passed, total_failed
    icon = "✅" if passed else "❌"
    if passed:
        total_passed += 1
    else:
        total_failed += 1
    print(f"  {icon}  {label}  {detail}")


# ─────────────────────────────────────────────────────────────
# TEST 1 — Environment
# ─────────────────────────────────────────────────────────────
header("TEST 1 — Environment")
import os
key = os.getenv("GROQ_API_KEY")
check("GROQ_API_KEY loaded", bool(key), f"({key[:10]}...)" if key else "(missing)")


# ─────────────────────────────────────────────────────────────
# TEST 2 — All Imports
# ─────────────────────────────────────────────────────────────
header("TEST 2 — All Subsystem Imports")

try:
    from ai.subsystems.subsystem_a import extract_conflict
    check("subsystem_a imports", True)
except Exception as e:
    check("subsystem_a imports", False, str(e))

try:
    from ai.subsystems.subsystem_b import generate_neutral_summary
    check("subsystem_b imports", True)
except Exception as e:
    check("subsystem_b imports", False, str(e))

try:
    from ai.subsystems.subsystem_c import generate_questionnaire
    check("subsystem_c imports", True)
except Exception as e:
    check("subsystem_c imports", False, str(e))

try:
    from ai.subsystems.subsystem_d import generate_batna_watna
    check("subsystem_d imports", True)
except Exception as e:
    check("subsystem_d imports", False, str(e))

try:
    from ai.subsystems.subsystem_e import run_subsystem_e
    check("subsystem_e imports", True)
except Exception as e:
    check("subsystem_e imports", False, str(e))

try:
    from ai.subsystems.subsystem_f import run_subsystem_f
    check("subsystem_f imports", True)
except Exception as e:
    check("subsystem_f imports", False, str(e))

try:
    from ai.subsystems.subsystem_g import calculate_mediatability
    check("subsystem_g imports", True)
except Exception as e:
    check("subsystem_g imports", False, str(e))

try:
    from ai.pipeline_burst1 import run_burst1_pipeline
    check("pipeline_burst1 imports", True)
except Exception as e:
    check("pipeline_burst1 imports", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 3 — Scenario Files
# ─────────────────────────────────────────────────────────────
header("TEST 3 — Scenario JSON Files")

for i in range(1, 9):
    fname = f"S-0{i}.json"
    fpath = SCENARIOS_DIR / fname
    if fpath.exists():
        with open(fpath, encoding="utf-8") as f:
            data = json.load(f)
        has_fields = all(k in data for k in ["party_a_statement", "party_b_statement", "expected"])
        check(f"{fname} valid", has_fields)
    else:
        check(f"{fname} exists", False, "(missing)")


# ─────────────────────────────────────────────────────────────
# TEST 4 — Sub-system A on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 4 — Sub-system A on S-01")

try:
    from ai.subsystems.subsystem_a import extract_conflict
    with open(SCENARIOS_DIR / "S-01.json", encoding="utf-8") as f:
        s01 = json.load(f)
    out = extract_conflict(s01["party_a_statement"], s01["party_b_statement"])
    if is_failed(out):
        check("Sub-system A runs", False, str(out))
    else:
        check("Sub-system A runs", True)
        check("dispute_type correct", out.dispute_type.value == "landlord_tenant", f"got={out.dispute_type}")
        check("confidence >= 0.7", out.extraction_confidence >= 0.7, f"got={out.extraction_confidence}")
except Exception as e:
    check("Sub-system A runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 5 — Sub-system E on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 5 — Sub-system E (Bias Removal) on S-01")

try:
    from ai.subsystems.subsystem_e import run_subsystem_e
    with open(SCENARIOS_DIR / "S-01.json", encoding="utf-8") as f:
        s01 = json.load(f)
    out = run_subsystem_e(s01["party_a_statement"])
    if is_failed(out):
        check("Sub-system E runs", False, str(out))
    else:
        check("Sub-system E runs", True)
        check("bias_detected field exists", hasattr(out, "bias_detected"))
except Exception as e:
    check("Sub-system E runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 6 — Sub-system F on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 6 — Sub-system F (Tone Analysis) on S-01")

try:
    from ai.subsystems.subsystem_f import run_subsystem_f
    with open(SCENARIOS_DIR / "S-01.json", encoding="utf-8") as f:
        s01 = json.load(f)
    out = run_subsystem_f(s01["party_a_statement"], s01["party_b_statement"])
    if is_failed(out):
        check("Sub-system F runs", False, str(out))
    else:
        check("Sub-system F runs", True)
        check("hostility score 1-10", 1 <= out.party_a_tone.hostility_score <= 10,
              f"got={out.party_a_tone.hostility_score}")
except Exception as e:
    check("Sub-system F runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 7 — Full Pipeline on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 7 — Full Burst 1 Pipeline on S-01")

try:
    from ai.pipeline_burst1 import run_burst1_pipeline
    with open(SCENARIOS_DIR / "S-01.json", encoding="utf-8") as f:
        s01 = json.load(f)

    result = run_burst1_pipeline(
        s01["party_a_statement"],
        s01["party_b_statement"],
        case_id="test-S-01"
    )

    check("Pipeline runs without crash", True)
    check("bias_removal_a completed", result.bias_removal_a is not None)
    check("bias_removal_b completed", result.bias_removal_b is not None)
    check("tone_analysis completed", result.tone_analysis is not None)
    check("conflict_extraction completed", result.conflict_extraction is not None)
    check("neutral_summary completed", result.neutral_summary is not None)
    check("mediatability completed", result.mediatability is not None)

except Exception as e:
    check("Pipeline runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# FINAL SCORE
# ─────────────────────────────────────────────────────────────
total = total_passed + total_failed
pct = int(total_passed / total * 100) if total > 0 else 0

print("\n" + "="*60)
print("  FINAL SCORE")
print("="*60)
print(f"  Passed: {total_passed}/{total} ({pct}%)")
print(f"  Failed: {total_failed}/{total}")

if total_failed == 0:
    print("\n  🎉 Everything working! Ready for Week 3 pipeline.")
elif total_failed <= 3:
    print("\n  ⚠️  Almost there. Fix the failed items above.")
else:
    print("\n  ❌ Several things need fixing.")
print("="*60)