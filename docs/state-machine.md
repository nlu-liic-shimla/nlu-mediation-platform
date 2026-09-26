# NLU Mediation Platform — State Machine Documentation
# Version: 4.0 | Owner: Backend Role 1 | Updated: Week 4

---

## The Golden Rule
The state machine is the ONLY path to changing case status.
No route handler, Celery task, or helper function ever sets case.status directly.
All status changes go through transition() in app/core/state_machine.py

Verify with:
  findstr /r /s "status.*=" app\api\v1\routes\*.py
Any line setting status directly (not inside state_machine.py) is a bug.

---

## All States (18 total)

### Application Request States (Path 1 only)
These live on the application_requests table, NOT the cases table.

| State | Description | Who Triggers |
|-------|-------------|--------------|
| APPLICATION_PENDING | Party filed request, waiting for mediator | Party submits application |
| APPLICATION_REJECTED | Mediator rejected the request | Mediator clicks Reject |
| WITHDRAWN | Party withdrew before mediator acted | Party clicks Withdraw |

### Case States (both paths — on cases table)
Both Path 1 and Path 2 are identical from BOTH_INVITED onwards.

| State | Description | Who Triggers |
|-------|-------------|--------------|
| BOTH_INVITED | Case created, both invitation links generated | Mediator creates case or accepts application |
| FIRST_PARTY_SUBMITTED | One party submitted, waiting for other | First party submits intake wizard |
| BOTH_SUBMITTED | Both submitted, Burst 1 triggers automatically | Second party submits intake wizard |
| BURST_1_PROCESSING | AI Burst 1 pipeline running | Celery auto-trigger |
| BURST_1_COMPLETE | AI analysis ready for mediator review | Celery on pipeline success |
| PROCESSING_FAILED | AI pipeline failed, retry available | Celery on any unhandled exception |
| QUESTIONNAIRE_ACTIVE | Mediator sent questionnaire to both parties | Mediator clicks Send Questionnaire |
| QUESTIONNAIRE_COMPLETE | Both parties answered, Burst 2 triggers | System detects second response |
| BURST_2_PROCESSING | BATNA/WATNA AI pipeline running | Celery auto-trigger |
| BURST_2_COMPLETE | BATNA/WATNA results ready | Celery on pipeline success |
| PROPOSAL_DRAFT | Mediator created proposal, NOT visible to parties | Mediator creates proposal |
| PROPOSAL_PUBLISHED | Proposal published, parties can respond | Mediator publishes |
| MEDIATION_IN_PROGRESS | At least one party rejected, revision in progress | System on rejection |
| MEDIATION_COMPLETE | Both parties accepted a proposal | System when both accept |
| MEDIATION_FAILED | Max rounds exhausted with no agreement | System or mediator |

---

## All Valid Transitions (21 total)

| From | To | Triggered By | Condition |
|------|----|--------------|-----------|
| BOTH_INVITED | FIRST_PARTY_SUBMITTED | System | First party submits intake wizard |
| BOTH_INVITED | BOTH_SUBMITTED | System | Both submit simultaneously (edge case) |
| FIRST_PARTY_SUBMITTED | BOTH_SUBMITTED | System | Second party submits intake wizard |
| BOTH_SUBMITTED | BURST_1_PROCESSING | Celery | Auto on BOTH_SUBMITTED state change |
| BURST_1_PROCESSING | BURST_1_COMPLETE | Celery | All 5 sub-systems succeed |
| BURST_1_PROCESSING | PROCESSING_FAILED | Celery | Any exception in pipeline |
| BURST_1_COMPLETE | QUESTIONNAIRE_ACTIVE | Mediator | Clicks Send Questionnaire after reviewing AI analysis |
| QUESTIONNAIRE_ACTIVE | QUESTIONNAIRE_COMPLETE | System | Second party submits questionnaire responses |
| QUESTIONNAIRE_COMPLETE | BURST_2_PROCESSING | Celery | Auto on QUESTIONNAIRE_COMPLETE state change |
| BURST_2_PROCESSING | BURST_2_COMPLETE | Celery | Sub-system D (BATNA/WATNA) succeeds |
| BURST_2_PROCESSING | PROCESSING_FAILED | Celery | Any exception in pipeline |
| BURST_2_COMPLETE | PROPOSAL_DRAFT | Mediator | Clicks Create Proposal |
| PROPOSAL_DRAFT | PROPOSAL_PUBLISHED | Mediator | Clicks Publish (with confirmation modal) |
| PROPOSAL_PUBLISHED | MEDIATION_COMPLETE | System | Both parties accept — auto on second acceptance |
| PROPOSAL_PUBLISHED | MEDIATION_IN_PROGRESS | System | Any party rejects — auto on rejection |
| MEDIATION_IN_PROGRESS | PROPOSAL_DRAFT | Mediator | Creates new round proposal after reviewing rejections |
| MEDIATION_IN_PROGRESS | MEDIATION_COMPLETE | System | Both accept revised proposal |
| MEDIATION_IN_PROGRESS | MEDIATION_FAILED | System | Max rounds exhausted |
| MEDIATION_COMPLETE | MEDIATION_COMPLETE | Mediator | Finalise (self-transition — status unchanged, audit log records action) |
| PROCESSING_FAILED | BURST_1_PROCESSING | Mediator | Clicks Retry on Burst 1 failure |
| PROCESSING_FAILED | BURST_2_PROCESSING | Mediator | Clicks Retry on Burst 2 failure |

---

## What Changed From Week 2 Documentation

The Week 2 state machine documentation had incorrect state names.
These were all renamed in Version 5.0 (Week 3 alignment):

| Old Name (Week 2 — WRONG) | New Name (Version 5.0 — CORRECT) |
|---------------------------|-----------------------------------|
| INVITED | BOTH_INVITED |
| PARTY_A_SUBMITTED | FIRST_PARTY_SUBMITTED |
| CLOSED | MEDIATION_COMPLETE |
| PROPOSAL_UNDER_REVIEW | (removed — merged into PROPOSAL_PUBLISHED) |

The old names no longer exist anywhere in the codebase.
The CaseState enum in app/core/state_machine.py is the single source of truth.

---

## New States Added in Week 4

| State | Why Added |
|-------|-----------|
| PROPOSAL_DRAFT | Mediator needs to edit before parties see — parties cannot see draft state proposals |
| MEDIATION_FAILED | Needed for max rounds exhausted path and against party repeated decline path |

---

## PROCESSING_FAILED Recovery

When any AI pipeline fails:
1. Celery catches the exception
2. transition(case_id, PROCESSING_FAILED) is called
3. Case status becomes PROCESSING_FAILED
4. Mediator sees error indicator with [Retry Analysis] button
5. Mediator clicks retry
6. POST /cases/{id}/analysis/retry-full clears old results
7. Case transitions back to BURST_1_PROCESSING (or BURST_2_PROCESSING)
8. Full pipeline reruns from scratch
9. Parties see neutral "Analysis in progress" message — never see the word "failed"

---

## Negotiation Loop — How Rounds Work

Round tracking uses two columns on the cases table:
  negotiation_round: int (current round, increments on each publish)
  max_rounds: int (default 3, can be extended by mediator with mandatory reason)

Flow per round:
  BURST_2_COMPLETE
    → Mediator creates proposal (PROPOSAL_DRAFT)
    → Mediator publishes (PROPOSAL_PUBLISHED, negotiation_round + 1)
    → Parties respond
    → Both accept → MEDIATION_COMPLETE (exit loop)
    → Any reject → MEDIATION_IN_PROGRESS
    → Sub-system H generates revision suggestions
    → Mediator creates new proposal (PROPOSAL_DRAFT, back in loop)

When negotiation_round >= max_rounds:
  POST /proposals/{id}/publish returns 409 ROUNDS_EXHAUSTED
  Mediator must use POST /proposals/extend-rounds (mandatory reason, logged to audit)

---

## Audit Log Events Written on Every Transition

Every call to transition() writes to audit_logs automatically.
These additional named events are written by route handlers and Celery tasks:

| Event | Written By |
|-------|-----------|
| QUESTIONNAIRE_SENT | POST /questionnaires (mediator sends) |
| REQUESTING_PARTY_ANSWERED | POST /questionnaires/{id}/responses |
| AGAINST_PARTY_ANSWERED | POST /questionnaires/{id}/responses |
| BURST_2_STARTED | Celery process_burst_2 task |
| BURST_2_COMPLETED | Celery process_burst_2 task |
| BURST_2_FAILED | Celery process_burst_2 task on exception |
| PROPOSAL_DRAFT_CREATED | POST /proposals |
| PROPOSAL_DRAFT_SAVED | PATCH /proposals/{id} |
| PROPOSAL_PUBLISHED | POST /proposals/{id}/publish |
| PARTY_ACCEPTED_PROPOSAL | POST /proposals/{id}/respond |
| PARTY_REJECTED_PROPOSAL | POST /proposals/{id}/respond |
| PROPOSAL_REVISION_GENERATED | Celery generate_proposal_revision task |
| ROUNDS_EXTENDED | POST /proposals/extend-rounds |
| MEDIATION_COMPLETE | System on both accept |
| MEDIATION_IN_PROGRESS | System on any reject |
| CASE_FINALISED | POST /finalise |
| PARTY_CONFIRMED_SETTLEMENT | POST /settlement/confirm (Backend 2) |
| SETTLEMENT_PDF_GENERATED | Celery generate_settlement_pdf (Backend 2) |

The audit_logs table is INSERT-only.
No UPDATE or DELETE policy exists on it.
This is enforced at RLS level in Supabase.