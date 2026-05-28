# AI Role — Week 1 Progress Report
**NLU Shimla — AI Mediation Platform**  
Owner: Vaidant Hundet + Rishika Thakur  
Week: 1 | Date: May 2026

---

## What Was Built in Week 1

### Files Created
| File | Owner | Description |
|---|---|---|
| `ai/schemas.py` | Vaidant | All 7 Pydantic output models for all sub-systems |
| `ai/utils/ai_client.py` | Vaidant | Groq API client with retry logic and is_failed() check |
| `ai/subsystems/subsystem_a.py` | Vaidant | Conflict Extraction |
| `ai/subsystems/subsystem_b.py` | Vaidant | Neutral Summary |
| `ai/subsystems/subsystem_c.py` | Rishika | Questionnaire Generation |
| `ai/subsystems/subsystem_d.py` | Vaidant | BATNA/WATNA Scoring |
| `ai/subsystems/subsystem_e.py` | Rishika | Bias Removal |
| `ai/subsystems/subsystem_f.py` | Rishika | Tone Analysis |
| `ai/subsystems/subsystem_g.py` | Rishika | Mediatability Score |
| `ai/pipeline_burst1.py` | Vaidant | Burst 1 pipeline skeleton |
| `tests/scenarios/S-01.json` | Vaidant | Landlord-tenant scenario |
| `tests/scenarios/S-02.json` | Vaidant | Freelance unpaid invoice |
| `tests/scenarios/S-03.json` | Vaidant | Wrongful dismissal |
| `tests/scenarios/S-04.json` | Vaidant | Defective consumer product |
| `tests/scenarios/S-05.json` | Vaidant | Business partnership dissolution |
| `tests/scenarios/S-06.json` | Vaidant | Property boundary dispute |
| `tests/scenarios/S-07.json` | Vaidant | Construction delay |
| `tests/scenarios/S-08.json` | Vaidant | Vague edge case |

---

## The 7 AI Sub-systems

| Sub-system | Name | Input | Output | Owner |
|---|---|---|---|---|
| A | Conflict Extraction | Raw party statements | Structured conflict JSON | Vaidant |
| B | Neutral Summary | Conflict JSON | 300-600 word summary | Vaidant |
| C | Questionnaire Generation | Conflict JSON | 8-12 targeted questions | Rishika |
| D | BATNA/WATNA | Conflict JSON + answers | Negotiation scores | Vaidant |
| E | Bias Removal | Neutral summary | De-biased summary | Rishika |
| F | Tone Analysis | Raw statements | Hostility/openness scores | Rishika |
| G | Mediatability Score | Conflict JSON | Score 0-100 + band | Rishika |

---

## Burst 1 Pipeline Order

| Step | Sub-system | Input | Output | Week |
|---|---|---|---|---|
| 1a | E — Bias Removal | Raw Party A statement | Cleaned text | ✅ Week 1 Done |
| 1b | E — Bias Removal | Raw Party B statement | Cleaned text | ✅ Week 1 Done |
| 1c | F — Tone Analysis | Raw statements (both) | Hostility/openness scores | ✅ Week 1 Done |
| 2 | A — Conflict Extraction | Bias-removed text | Conflict JSON | ✅ Week 1 Done |
| 3 | B — Neutral Summary | Conflict JSON | 300-600 word summary | ✅ Week 1 Done |
| 4 | G — Mediatability Score | Conflict JSON | Score 0-100 + band | ✅ Week 1 Done |

### Why this order?
- E runs BEFORE A — conflict extraction must receive clean text
- F runs on RAW text — tone scores must reflect original emotional state
- B runs AFTER A — summary generated from structured extraction, never raw text
- G runs AFTER A — scoring rubric uses structured conflict data

---

## Week 1 Milestone Status

| Task | Owner | Status |
|---|---|---|
| All 7 Pydantic schemas defined in schemas.py | Vaidant | ✅ Done |
| Groq API client with retry logic | Vaidant | ✅ Done |
| Sub-system A — conflict extraction | Vaidant | ✅ Done |
| Sub-system B — neutral summary | Vaidant | ✅ Done |
| Sub-system D — BATNA/WATNA | Vaidant | ✅ Done |
| Sub-system C — questionnaire generation | Rishika | ✅ Done |
| Sub-system E — bias removal | Rishika | ✅ Done |
| Sub-system F — tone analysis | Rishika | ✅ Done |
| Sub-system G — mediatability score | Rishika | ✅ Done |
| All 8 test scenario JSON files created | Vaidant | ✅ Done |
| pipeline_burst1.py skeleton | Vaidant | ✅ Done |
| .gitignore configured | Vaidant | ✅ Done |

---

## Week 2 Milestone Status

| Task | Owner | Status |
|---|---|---|
| Sub-system A tested on all 8 scenarios | Vaidant | ✅ 8/8 (100%) |
| Sub-system E — tested and verified | Rishika | ✅ Done |
| Sub-system F — tested and verified | Rishika | ✅ Done |
| pipeline_burst1.py — E and F wired | Vaidant | ✅ Done |
| Prompt engineering — dispute type definitions | Vaidant | ✅ Done |
| All prompts documented | Both | ✅ Done |

---

## Sub-system A Test Results — Week 2

| Scenario | Expected | Got | Confidence | Status |
|---|---|---|---|---|
| S-01 | landlord_tenant | landlord_tenant | 0.9 | ✅ Pass |
| S-02 | commercial_contract | commercial_contract | 0.9 | ✅ Pass |
| S-03 | employment | employment | 0.9 | ✅ Pass |
| S-04 | consumer | consumer | 0.9 | ✅ Pass |
| S-05 | family_business | family_business | 0.9 | ✅ Pass |
| S-06 | property_boundary | property_boundary | 0.9 | ✅ Pass |
| S-07 | construction | construction | 0.9 | ✅ Pass |
| S-08 | other | other | 0.6 | ✅ Pass |

**Pass rate: 8/8 (100%)**

---

## Week 3 Plan

| Task | Owner |
|---|---|
| Complete pipeline_burst1.py with sub-systems A, B, G | Vaidant |
| Wire full Burst 1 pipeline to Celery task | Vaidant |
| Test full pipeline on all 8 scenarios | Both |
| Sub-system B prompt refinement | Vaidant |
| Sub-system G prompt refinement | Rishika |

---

*NLU Shimla AI Mediation Platform • AI Role • Week 1-2 • Team Confidential*
