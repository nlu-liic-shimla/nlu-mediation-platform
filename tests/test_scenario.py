# tests/test_scenario.py
"""
Single Scenario Debugger — Run all subsystems on one scenario
Usage:
    python -m tests.test_scenario S-01
    python -m tests.test_scenario S-03
    python -m tests.test_scenario S-07
"""

import sys
import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from ai.utils.ai_client import is_failed

SCENARIOS_DIR = Path("tests/scenarios")

# ── Pick scenario from command line ───────────────────────────
if len(sys.argv) < 2:
    print("\nUsage: python -m tests.test_scenario <scenario_id>")
    print("Example: python -m tests.test_scenario S-01")
    print("\nAvailable scenarios:")
    for p in sorted(SCENARIOS_DIR.glob("S-*.json")):
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        print(f"  {p.stem} — {d.get('description', '')}")
    sys.exit(0)

scenario_id = sys.argv[1].upper()
if not scenario_id.endswith(".json"):
    scenario_id += ".json"

fpath = SCENARIOS_DIR / scenario_id
if not fpath.exists():
    print(f"\n❌ Scenario file not found: {fpath}")
    print("Available scenarios:")
    for p in sorted(SCENARIOS_DIR.glob("S-*.json")):
        print(f"  {p.stem}")
    sys.exit(1)

with open(fpath, encoding="utf-8") as f:
    data = json.load(f)

desc         = data.get("description", scenario_id)
party_a_stmt = data["party_a_statement"]
party_b_stmt = data["party_b_statement"]

# ── Header ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"  SCENARIO: {scenario_id.replace('.json', '')} — {desc}")
print("=" * 60)
print(f"\n  Party A statement:\n    {party_a_stmt.strip()}")
print(f"\n  Party B statement:\n    {party_b_stmt.strip()}")


# ── Step 1a: Sub-system F — Tone Analysis ─────────────────────
print("\n" + "=" * 60)
print("  STEP 1a — SUB-SYSTEM F: Tone Analysis")
print("=" * 60)
tone_result = None
try:
    from ai.subsystems.subsystem_f import run_subsystem_f
    out = run_subsystem_f(party_a_stmt, party_b_stmt)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
    else:
        tone_result = out
        print(f"\n  Party A")
        print(f"    Category:  {out.party_a_tone.tone_category.value}")
        print(f"    Hostility: {out.party_a_tone.hostility_score}/10")
        print(f"    Openness:  {out.party_a_tone.openness_score}/10")
        print(f"    Summary:   {out.party_a_tone.tone_summary}")
        print(f"    Key phrases:")
        for p in out.party_a_tone.key_emotional_phrases:
            print(f"      • \"{p}\"")

        print(f"\n  Party B")
        print(f"    Category:  {out.party_b_tone.tone_category.value}")
        print(f"    Hostility: {out.party_b_tone.hostility_score}/10")
        print(f"    Openness:  {out.party_b_tone.openness_score}/10")
        print(f"    Summary:   {out.party_b_tone.tone_summary}")
        print(f"    Key phrases:")
        for p in out.party_b_tone.key_emotional_phrases:
            print(f"      • \"{p}\"")

        print(f"\n  Combined conflict intensity: {out.combined_conflict_intensity}/10")
        print(f"  Mediator advisory: {out.mediator_advisory}")
except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Step 1b: Sub-system E — Bias Removal ──────────────────────
print("\n" + "=" * 60)
print("  STEP 1b — SUB-SYSTEM E: Bias Removal")
print("=" * 60)
cleaned_a = party_a_stmt
cleaned_b = party_b_stmt
bias_a = None
bias_b = None

try:
    from ai.subsystems.subsystem_e import run_subsystem_e

    print("\n  Party A:")
    out_a = run_subsystem_e(party_a_stmt, "Party A")
    if is_failed(out_a):
        print(f"    ❌ Failed — using original")
    else:
        bias_a = out_a
        cleaned_a = out_a.revised_summary or party_a_stmt
        print(f"    Bias detected: {out_a.bias_detected}  |  Flags: {len(out_a.bias_flags)}  |  Check passed: {out_a.bias_check_passed}")
        for flag in out_a.bias_flags:
            print(f"    • [{flag.bias_type.value}]")
            print(f"      Original:    \"{flag.original_phrase}\"")
            print(f"      Replacement: \"{flag.suggested_replacement}\"")
        print(f"    Cleaned: {cleaned_a}")

    print("\n  Party B:")
    out_b = run_subsystem_e(party_b_stmt, "Party B")
    if is_failed(out_b):
        print(f"    ❌ Failed — using original")
    else:
        bias_b = out_b
        cleaned_b = out_b.revised_summary or party_b_stmt
        print(f"    Bias detected: {out_b.bias_detected}  |  Flags: {len(out_b.bias_flags)}  |  Check passed: {out_b.bias_check_passed}")
        for flag in out_b.bias_flags:
            print(f"    • [{flag.bias_type.value}]")
            print(f"      Original:    \"{flag.original_phrase}\"")
            print(f"      Replacement: \"{flag.suggested_replacement}\"")
        print(f"    Cleaned: {cleaned_b}")

except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Step 2: Sub-system A — Conflict Extraction ────────────────
print("\n" + "=" * 60)
print("  STEP 2 — SUB-SYSTEM A: Conflict Extraction")
print("=" * 60)
conflict = None
try:
    from ai.subsystems.subsystem_a import extract_conflict
    out = extract_conflict(cleaned_a, cleaned_b)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
        print("  ⚠️  Cannot continue without conflict extraction")
        sys.exit(1)
    else:
        conflict = out
        print(f"\n  Dispute type:       {out.dispute_type.value}")
        print(f"  Confidence:         {out.extraction_confidence}")
        print(f"  Monetary value:     INR {out.monetary_value}")
        print(f"  Jurisdiction clear: {out.jurisdiction_clear}")
        print(f"  Core dispute:       {out.core_dispute}")

        print(f"\n  Party A claims ({len(out.claims_party_a)}):")
        for c in out.claims_party_a:
            print(f"    • {c}")
        print(f"\n  Party B claims ({len(out.claims_party_b)}):")
        for c in out.claims_party_b:
            print(f"    • {c}")
        print(f"\n  Disputed facts ({len(out.disputed_facts)}):")
        for f_ in out.disputed_facts:
            print(f"    • {f_}")
        print(f"\n  Undisputed facts ({len(out.undisputed_facts)}):")
        for f_ in out.undisputed_facts:
            print(f"    • {f_}") if out.undisputed_facts else print("    (none)")
        if out.extraction_confidence < 0.5:
            print(f"\n  ⚠️  Low confidence — mediator review flag would trigger")
except Exception as e:
    print(f"  ❌ Exception: {e}")
    sys.exit(1)


# ── Step 3: Sub-system B — Neutral Summary ────────────────────
print("\n" + "=" * 60)
print("  STEP 3 — SUB-SYSTEM B: Neutral Summary")
print("=" * 60)
summary = None
try:
    from ai.subsystems.subsystem_b import generate_neutral_summary
    out = generate_neutral_summary(conflict)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
    else:
        summary = out
        print(f"\n  Summary:\n    {out.summary}")
        print(f"\n  Party A position:\n    {out.party_a_position}")
        print(f"\n  Party B position:\n    {out.party_b_position}")
        print(f"\n  Key issues:")
        for issue in out.key_issues:
            print(f"    • {issue}")
        if out.common_ground:
            print(f"\n  Common ground:\n    {out.common_ground}")
except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Step 4: Sub-system G — Mediatability Score ────────────────
print("\n" + "=" * 60)
print("  STEP 4 — SUB-SYSTEM G: Mediatability Score")
print("=" * 60)
try:
    from ai.subsystems.subsystem_g import calculate_mediatability
    out = calculate_mediatability(conflict)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
    else:
        print(f"\n  Score: {out.mediatability_score}/10  |  Band: {out.mediatability_band.value}")
        print(f"  Justification: {out.score_justification}")
        print(f"  Approach: {out.recommended_approach}")
        print(f"\n  Positive factors:")
        for f_ in out.positive_factors:
            print(f"    + {f_}")
        print(f"\n  Negative factors:")
        if out.negative_factors:
            for f_ in out.negative_factors:
                print(f"    - {f_}")
        else:
            print("    (none)")
except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Step 5: Sub-system C — Questionnaire ──────────────────────
print("\n" + "=" * 60)
print("  STEP 5 — SUB-SYSTEM C: Questionnaire Generation")
print("=" * 60)
try:
    from ai.subsystems.subsystem_c import generate_questionnaire
    out = generate_questionnaire(conflict)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
    else:
        print(f"\n  Rationale: {out.questionnaire_rationale}")
        print(f"\n  Questions ({len(out.questions)}):")
        for q in out.questions:
            print(f"\n    [{q.question_id}] → {q.directed_at} ({q.question_type})")
            print(f"    Q: {q.question_text}")
            print(f"    Purpose: {q.purpose}")
except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Step 6: Sub-system D — BATNA/WATNA ────────────────────────
print("\n" + "=" * 60)
print("  STEP 6 — SUB-SYSTEM D: BATNA / WATNA")
print("=" * 60)
try:
    from ai.subsystems.subsystem_d import generate_batna_watna
    out = generate_batna_watna(conflict)
    if is_failed(out):
        print(f"  ❌ Failed: {out.get('reason', out)}")
    else:
        print(f"\n  Party A — {out.party_a.batna_label.value} position")
        print(f"    BATNA ({out.party_a.batna_score}/10): {out.party_a.batna_reasoning}")
        print(f"    WATNA ({out.party_a.watna_score}/10): {out.party_a.watna_reasoning}")
        print(f"    Guidance: {out.party_a.negotiation_guidance}")
        if out.party_a.consult_solicitor_flag:
            print(f"    ⚠️  Solicitor consultation recommended")

        print(f"\n  Party B — {out.party_b.batna_label.value} position")
        print(f"    BATNA ({out.party_b.batna_score}/10): {out.party_b.batna_reasoning}")
        print(f"    WATNA ({out.party_b.watna_score}/10): {out.party_b.watna_reasoning}")
        print(f"    Guidance: {out.party_b.negotiation_guidance}")
        if out.party_b.consult_solicitor_flag:
            print(f"    ⚠️  Solicitor consultation recommended")

        print(f"\n  Settlement zone: {out.overall_settlement_zone or 'Not identified'}")
        print(f"\n  Disclaimer: {out.disclaimer}")
except Exception as e:
    print(f"  ❌ Exception: {e}")


# ── Done ──────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"  DONE — {scenario_id.replace('.json', '')} — {desc}")
print("=" * 60)
