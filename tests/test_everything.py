# tests/test_everything.py
"""
Master Test Script — Tests everything with full verbose output
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
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def subheader(title):
    print(f"\n  ── {title} ──────────────────────────────")


def check(label, passed, detail=""):
    global total_passed, total_failed
    icon = "✅" if passed else "❌"
    if passed:
        total_passed += 1
    else:
        total_failed += 1
    print(f"  {icon}  {label}  {detail}")


def show(label, value):
    """Print a verbose output line without affecting pass/fail count."""
    print(f"     {label}: {value}")


def divider():
    print("  " + "-" * 56)


def load_scenario(fname):
    fpath = SCENARIOS_DIR / fname
    if not fpath.exists():
        return None
    with open(fpath, encoding="utf-8") as f:
        return json.load(f)


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
    data = load_scenario(fname)
    if data:
        has_fields = all(k in data for k in ["party_a_statement", "party_b_statement", "expected"])
        check(f"{fname} valid", has_fields)
    else:
        check(f"{fname} exists", False, "(missing)")


# ─────────────────────────────────────────────────────────────
# PRE-LOAD: Run Sub-system A on all 8 scenarios ONCE
# Cache results so tests 10-15 all reuse without extra API calls
# ─────────────────────────────────────────────────────────────
print("\n  [Pre-loading] Running Sub-system A on all 8 scenarios...")
conflict_cache = {}  # fname -> ConflictExtraction or None

from ai.subsystems.subsystem_a import extract_conflict

for i in range(1, 9):
    fname = f"S-0{i}.json"
    data = load_scenario(fname)
    if not data:
        conflict_cache[fname] = None
        continue
    try:
        result = extract_conflict(data["party_a_statement"], data["party_b_statement"])
        if is_failed(result):
            conflict_cache[fname] = None
            print(f"    ❌ {fname} extraction failed")
        else:
            conflict_cache[fname] = result
            print(f"    ✅ {fname} — {result.dispute_type.value} (conf={result.extraction_confidence})")
    except Exception as e:
        conflict_cache[fname] = None
        print(f"    ❌ {fname} exception: {e}")


# ─────────────────────────────────────────────────────────────
# TEST 4 — Sub-system A on S-01 (use cache)
# ─────────────────────────────────────────────────────────────
header("TEST 4 — Sub-system A on S-01")

out = conflict_cache.get("S-01.json")
if out is None:
    check("Sub-system A runs", False, "extraction failed or missing")
else:
    check("Sub-system A runs", True)
    check("dispute_type correct", out.dispute_type.value == "landlord_tenant", f"got={out.dispute_type}")
    check("confidence >= 0.7", out.extraction_confidence >= 0.7, f"got={out.extraction_confidence}")
    divider()
    show("Dispute type",     out.dispute_type.value)
    show("Core dispute",     out.core_dispute)
    show("Monetary value",   f"INR {out.monetary_value}")
    show("Confidence",       out.extraction_confidence)
    show("Jurisdiction",     out.jurisdiction_clear)
    show("Party A claims",   len(out.claims_party_a))
    for c in out.claims_party_a:
        print(f"       • {c}")
    show("Party B claims",   len(out.claims_party_b))
    for c in out.claims_party_b:
        print(f"       • {c}")
    show("Disputed facts",   len(out.disputed_facts))
    for f_ in out.disputed_facts:
        print(f"       • {f_}")
    show("Undisputed facts", len(out.undisputed_facts))
    for f_ in out.undisputed_facts:
        print(f"       • {f_}")


# ─────────────────────────────────────────────────────────────
# TEST 5 — Sub-system E on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 5 — Sub-system E (Bias Removal) on S-01")

try:
    from ai.subsystems.subsystem_e import run_subsystem_e
    s01 = load_scenario("S-01.json")

    out_a = run_subsystem_e(s01["party_a_statement"], "Party A")
    out_b = run_subsystem_e(s01["party_b_statement"], "Party B")

    if is_failed(out_a):
        check("Sub-system E runs (Party A)", False, str(out_a))
    else:
        check("Sub-system E runs (Party A)", True)
        check("bias_detected field exists", hasattr(out_a, "bias_detected"))
        divider()
        subheader("Party A")
        show("Bias detected",     out_a.bias_detected)
        show("Bias check passed", out_a.bias_check_passed)
        show("Flags",             len(out_a.bias_flags))
        for flag in out_a.bias_flags:
            print(f"       • [{flag.bias_type}] \"{flag.original_phrase}\" → \"{flag.suggested_replacement}\"")
        show("Cleaned statement", out_a.revised_summary or "(no change needed)")

    if is_failed(out_b):
        check("Sub-system E runs (Party B)", False, str(out_b))
    else:
        check("Sub-system E runs (Party B)", True)
        subheader("Party B")
        show("Bias detected",     out_b.bias_detected)
        show("Bias check passed", out_b.bias_check_passed)
        show("Flags",             len(out_b.bias_flags))
        for flag in out_b.bias_flags:
            print(f"       • [{flag.bias_type}] \"{flag.original_phrase}\" → \"{flag.suggested_replacement}\"")
        show("Cleaned statement", out_b.revised_summary or "(no change needed)")

except Exception as e:
    check("Sub-system E runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 6 — Sub-system F on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 6 — Sub-system F (Tone Analysis) on S-01")

try:
    from ai.subsystems.subsystem_f import run_subsystem_f
    s01 = load_scenario("S-01.json")
    out = run_subsystem_f(s01["party_a_statement"], s01["party_b_statement"])
    if is_failed(out):
        check("Sub-system F runs", False, str(out))
    else:
        check("Sub-system F runs", True)
        check("hostility score 1-10", 1 <= out.party_a_tone.hostility_score <= 10,
              f"got={out.party_a_tone.hostility_score}")
        divider()
        subheader("Party A Tone")
        show("Category",          out.party_a_tone.tone_category.value)
        show("Hostility",         f"{out.party_a_tone.hostility_score}/10")
        show("Openness",          f"{out.party_a_tone.openness_score}/10")
        show("Summary",           out.party_a_tone.tone_summary)
        show("Key phrases",       "")
        for p in out.party_a_tone.key_emotional_phrases:
            print(f"       • \"{p}\"")
        subheader("Party B Tone")
        show("Category",          out.party_b_tone.tone_category.value)
        show("Hostility",         f"{out.party_b_tone.hostility_score}/10")
        show("Openness",          f"{out.party_b_tone.openness_score}/10")
        show("Summary",           out.party_b_tone.tone_summary)
        show("Key phrases",       "")
        for p in out.party_b_tone.key_emotional_phrases:
            print(f"       • \"{p}\"")
        subheader("Combined")
        show("Conflict intensity", f"{out.combined_conflict_intensity}/10")
        show("Mediator advisory",  out.mediator_advisory)
except Exception as e:
    check("Sub-system F runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 7 — Full Burst 1 Pipeline on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 7 — Full Burst 1 Pipeline on S-01")

try:
    from ai.pipeline_burst1 import run_burst1_pipeline
    s01 = load_scenario("S-01.json")

    result = run_burst1_pipeline(
        s01["party_a_statement"],
        s01["party_b_statement"],
        case_id="test-S-01"
    )

    check("Pipeline runs without crash",   True)
    check("bias_removal_a completed",      result.bias_removal_a is not None)
    check("bias_removal_b completed",      result.bias_removal_b is not None)
    check("tone_analysis completed",       result.tone_analysis is not None)
    check("conflict_extraction completed", result.conflict_extraction is not None)
    check("neutral_summary completed",     result.neutral_summary is not None)
    check("mediatability completed",       result.mediatability is not None)

    if result.neutral_summary:
        divider()
        subheader("Neutral Summary (Sub-system B)")
        show("Summary",          result.neutral_summary.summary)
        show("Party A position", result.neutral_summary.party_a_position)
        show("Party B position", result.neutral_summary.party_b_position)
        show("Key issues", "")
        for issue in result.neutral_summary.key_issues:
            print(f"       • {issue}")
        if result.neutral_summary.common_ground:
            show("Common ground", result.neutral_summary.common_ground)

    if result.mediatability:
        divider()
        subheader("Mediatability Score (Sub-system G)")
        show("Score",            f"{result.mediatability.mediatability_score}/10")
        show("Band",             result.mediatability.mediatability_band.value)
        show("Justification",    result.mediatability.score_justification)
        show("Approach",         result.mediatability.recommended_approach)
        show("Positive factors", "")
        for f_ in result.mediatability.positive_factors:
            print(f"       • {f_}")
        show("Negative factors", "")
        for f_ in result.mediatability.negative_factors:
            print(f"       • {f_}")

except Exception as e:
    check("Pipeline runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 8 — Sub-system C (Questionnaire) on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 8 — Sub-system C (Questionnaire) on S-01")

try:
    from ai.subsystems.subsystem_c import generate_questionnaire
    conflict = conflict_cache.get("S-01.json")
    if conflict is None:
        check("Sub-system C runs", False, "Sub-system A cache missing")
    else:
        out = generate_questionnaire(conflict)
        if is_failed(out):
            check("Sub-system C runs", False, str(out))
        else:
            check("Sub-system C runs", True)
            check("questions generated", len(out.questions) >= 3, f"got={len(out.questions)}")
            divider()
            show("Rationale", out.questionnaire_rationale)
            show("Questions", f"{len(out.questions)} total")
            for q in out.questions:
                print(f"\n       [{q.question_id}] → {q.directed_at} ({q.question_type})")
                print(f"       Q: {q.question_text}")
                print(f"       Purpose: {q.purpose}")
except Exception as e:
    check("Sub-system C runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 9 — Sub-system D (BATNA/WATNA) on S-01
# ─────────────────────────────────────────────────────────────
header("TEST 9 — Sub-system D (BATNA/WATNA) on S-01")

try:
    from ai.subsystems.subsystem_d import generate_batna_watna
    conflict = conflict_cache.get("S-01.json")
    if conflict is None:
        check("Sub-system D runs", False, "Sub-system A cache missing")
    else:
        out = generate_batna_watna(conflict)
        if is_failed(out):
            check("Sub-system D runs", False, str(out))
        else:
            check("Sub-system D runs", True)
            check("batna >= watna (Party A)",
                  out.party_a.batna_score >= out.party_a.watna_score,
                  f"batna={out.party_a.batna_score} watna={out.party_a.watna_score}")
            check("batna >= watna (Party B)",
                  out.party_b.batna_score >= out.party_b.watna_score,
                  f"batna={out.party_b.batna_score} watna={out.party_b.watna_score}")
            divider()
            subheader("Party A")
            show("BATNA",            f"{out.party_a.batna_label.value} ({out.party_a.batna_score}/10)")
            show("WATNA",            f"{out.party_a.watna_label.value} ({out.party_a.watna_score}/10)")
            show("BATNA reasoning",  out.party_a.batna_reasoning)
            show("WATNA reasoning",  out.party_a.watna_reasoning)
            show("Guidance",         out.party_a.negotiation_guidance)
            show("Consult solicitor",out.party_a.consult_solicitor_flag)
            subheader("Party B")
            show("BATNA",            f"{out.party_b.batna_label.value} ({out.party_b.batna_score}/10)")
            show("WATNA",            f"{out.party_b.watna_label.value} ({out.party_b.watna_score}/10)")
            show("BATNA reasoning",  out.party_b.batna_reasoning)
            show("WATNA reasoning",  out.party_b.watna_reasoning)
            show("Guidance",         out.party_b.negotiation_guidance)
            show("Consult solicitor",out.party_b.consult_solicitor_flag)
            subheader("Settlement Zone")
            show("Zone", out.overall_settlement_zone or "Not identified")
except Exception as e:
    check("Sub-system D runs", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 10 — All 8 Scenarios through Sub-system A (from cache)
# ─────────────────────────────────────────────────────────────
header("TEST 10 — All 8 Scenarios through Sub-system A")

for i in range(1, 9):
    fname = f"S-0{i}.json"
    data  = load_scenario(fname)
    out   = conflict_cache.get(fname)

    if data is None:
        check(f"{fname} skipped", False, "(file missing)")
        continue

    expected_type = data.get("expected", {}).get("dispute_type", "")
    desc          = data.get("description", fname)

    if out is None:
        check(f"{fname} — {desc}", False, "extraction failed")
        continue

    correct_type = out.dispute_type.value == expected_type
    check(f"{fname} — {desc}", correct_type,
          f"type={out.dispute_type.value} conf={out.extraction_confidence}")
    show("Core dispute",     out.core_dispute)
    show("Monetary value",   f"INR {out.monetary_value}")
    show("Party A claims",   len(out.claims_party_a))
    for c in out.claims_party_a:
        print(f"       • {c}")
    show("Party B claims",   len(out.claims_party_b))
    for c in out.claims_party_b:
        print(f"       • {c}")
    show("Disputed facts",   len(out.disputed_facts))
    for f_ in out.disputed_facts:
        print(f"       • {f_}")
    show("Undisputed facts", len(out.undisputed_facts))
    for f_ in out.undisputed_facts:
        print(f"       • {f_}")


# ─────────────────────────────────────────────────────────────
# TEST 11 — All 8 Scenarios through Sub-system E (Bias Removal)
# ─────────────────────────────────────────────────────────────
header("TEST 11 — All 8 Scenarios through Sub-system E (Bias Removal)")

from ai.subsystems.subsystem_e import run_subsystem_e

for i in range(1, 9):
    fname = f"S-0{i}.json"
    data  = load_scenario(fname)
    if not data:
        continue

    desc = data.get("description", fname)
    subheader(f"{fname} — {desc}")

    for party_label, stmt in [("Party A", data["party_a_statement"]),
                               ("Party B", data["party_b_statement"])]:
        try:
            out = run_subsystem_e(stmt, party_label)
            if is_failed(out):
                check(f"{party_label} bias removal", False, str(out))
            else:
                check(f"{party_label} bias removal", True,
                      f"bias_detected={out.bias_detected} flags={len(out.bias_flags)}")
                for flag in out.bias_flags:
                    print(f"       • [{flag.bias_type}] \"{flag.original_phrase}\" → \"{flag.suggested_replacement}\"")
                print(f"       Cleaned: {out.revised_summary or stmt}")
        except Exception as e:
            check(f"{party_label} bias removal", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 12 — All 8 Scenarios through Sub-system F (Tone)
# ─────────────────────────────────────────────────────────────
header("TEST 12 — All 8 Scenarios through Sub-system F (Tone Analysis)")

from ai.subsystems.subsystem_f import run_subsystem_f

for i in range(1, 9):
    fname = f"S-0{i}.json"
    data  = load_scenario(fname)
    if not data:
        continue

    desc = data.get("description", fname)
    try:
        out = run_subsystem_f(data["party_a_statement"], data["party_b_statement"])
        if is_failed(out):
            check(f"{fname} — {desc}", False, str(out))
        else:
            check(f"{fname} — {desc}", True,
                  f"A={out.party_a_tone.hostility_score}/10 hostile  "
                  f"B={out.party_b_tone.hostility_score}/10 hostile  "
                  f"intensity={out.combined_conflict_intensity}/10")
            show("A tone",    f"{out.party_a_tone.tone_category.value} — {out.party_a_tone.tone_summary}")
            show("A phrases", "")
            for p in out.party_a_tone.key_emotional_phrases:
                print(f"       • \"{p}\"")
            show("B tone",    f"{out.party_b_tone.tone_category.value} — {out.party_b_tone.tone_summary}")
            show("B phrases", "")
            for p in out.party_b_tone.key_emotional_phrases:
                print(f"       • \"{p}\"")
            show("Advisory",  out.mediator_advisory)
    except Exception as e:
        check(f"{fname}", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 13 — All 8 Scenarios through Sub-system G (from cache)
# ─────────────────────────────────────────────────────────────
header("TEST 13 — All 8 Scenarios through Sub-system G (Mediatability)")

from ai.subsystems.subsystem_g import calculate_mediatability

for i in range(1, 9):
    fname   = f"S-0{i}.json"
    data    = load_scenario(fname)
    conflict = conflict_cache.get(fname)

    if not data:
        continue
    desc = data.get("description", fname)

    if conflict is None:
        check(f"{fname} — {desc}", False, "Sub-system A cache missing")
        continue

    try:
        out = calculate_mediatability(conflict)
        if is_failed(out):
            check(f"{fname} — {desc}", False, str(out))
        else:
            check(f"{fname} — {desc}", True,
                  f"score={out.mediatability_score}/10  band={out.mediatability_band.value}")
            show("Justification",    out.score_justification)
            show("Approach",         out.recommended_approach)
            show("Positive factors", "")
            for f_ in out.positive_factors:
                print(f"       • {f_}")
            show("Negative factors", "")
            for f_ in out.negative_factors:
                print(f"       • {f_}")
    except Exception as e:
        check(f"{fname}", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 14 — All 8 Scenarios through Sub-system C (from cache)
# ─────────────────────────────────────────────────────────────
header("TEST 14 — All 8 Scenarios through Sub-system C (Questionnaire)")

from ai.subsystems.subsystem_c import generate_questionnaire

for i in range(1, 9):
    fname    = f"S-0{i}.json"
    data     = load_scenario(fname)
    conflict = conflict_cache.get(fname)

    if not data:
        continue
    desc = data.get("description", fname)

    if conflict is None:
        check(f"{fname} — {desc}", False, "Sub-system A cache missing")
        continue

    try:
        out = generate_questionnaire(conflict)
        if is_failed(out):
            check(f"{fname} — {desc}", False, str(out))
        else:
            check(f"{fname} — {desc}", len(out.questions) >= 3,
                  f"{len(out.questions)} questions generated")
            show("Rationale", out.questionnaire_rationale)
            for q in out.questions:
                print(f"\n       [{q.question_id}] → {q.directed_at} ({q.question_type})")
                print(f"       Q: {q.question_text}")
                print(f"       Purpose: {q.purpose}")
    except Exception as e:
        check(f"{fname}", False, str(e))


# ─────────────────────────────────────────────────────────────
# TEST 15 — All 8 Scenarios through Sub-system D (from cache)
# ─────────────────────────────────────────────────────────────
header("TEST 15 — All 8 Scenarios through Sub-system D (BATNA/WATNA)")

from ai.subsystems.subsystem_d import generate_batna_watna

for i in range(1, 9):
    fname    = f"S-0{i}.json"
    data     = load_scenario(fname)
    conflict = conflict_cache.get(fname)

    if not data:
        continue
    desc = data.get("description", fname)

    if conflict is None:
        check(f"{fname} — {desc}", False, "Sub-system A cache missing")
        continue

    try:
        out = generate_batna_watna(conflict)
        if is_failed(out):
            check(f"{fname} — {desc}", False, str(out))
        else:
            check(f"{fname} — {desc}",
                  out.party_a.batna_score >= out.party_a.watna_score,
                  f"A: BATNA={out.party_a.batna_score} WATNA={out.party_a.watna_score}  "
                  f"B: BATNA={out.party_b.batna_score} WATNA={out.party_b.watna_score}")
            show("A BATNA",         f"{out.party_a.batna_label.value} ({out.party_a.batna_score}/10) — {out.party_a.batna_reasoning}")
            show("A WATNA",         f"{out.party_a.watna_label.value} ({out.party_a.watna_score}/10) — {out.party_a.watna_reasoning}")
            show("A Guidance",      out.party_a.negotiation_guidance)
            show("B BATNA",         f"{out.party_b.batna_label.value} ({out.party_b.batna_score}/10) — {out.party_b.batna_reasoning}")
            show("B WATNA",         f"{out.party_b.watna_label.value} ({out.party_b.watna_score}/10) — {out.party_b.watna_reasoning}")
            show("B Guidance",      out.party_b.negotiation_guidance)
            show("Settlement zone", out.overall_settlement_zone or "Not identified")
    except Exception as e:
        check(f"{fname}", False, str(e))


# ─────────────────────────────────────────────────────────────
# FINAL SCORE
# ─────────────────────────────────────────────────────────────
total = total_passed + total_failed
pct   = int(total_passed / total * 100) if total > 0 else 0

print("\n" + "=" * 60)
print("  FINAL SCORE")
print("=" * 60)
print(f"  Passed: {total_passed}/{total} ({pct}%)")
print(f"  Failed: {total_failed}/{total}")

if total_failed == 0:
    print("\n  🎉 Everything working! Ready for Week 3 pipeline.")
elif total_failed <= 3:
    print("\n  ⚠️  Almost there. Fix the failed items above.")
else:
    print("\n  ❌ Several things need fixing.")
print("=" * 60)
