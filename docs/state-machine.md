# NLU Mediation Platform — State Machine Documentation

## Overview
The state machine is the only path to changing case status.
No route handler ever sets case.status directly.
All changes go through transition() in app/core/state_machine.py

## States (13 total)

| State | Description | Who Triggers |
|-------|-------------|--------------|
| INVITED | Case created, against party not joined | Mediator creates case |
| PARTY_A_SUBMITTED | First party submitted | First party submits |
| BOTH_SUBMITTED | Both parties submitted | Second party submits |
| BURST_1_PROCESSING | AI Burst 1 running | Celery auto-trigger |
| BURST_1_COMPLETE | AI summary ready | Celery on completion |
| QUESTIONNAIRE_ACTIVE | Questions sent to parties | Mediator action |
| QUESTIONNAIRE_COMPLETE | Both parties answered | System detects |
| BURST_2_PROCESSING | BATNA/WATNA running | Celery auto-trigger |
| BURST_2_COMPLETE | BATNA/WATNA ready | Celery on completion |
| PROPOSAL_PUBLISHED | Mediator published proposal | Mediator action |
| PROPOSAL_UNDER_REVIEW | Parties reviewing proposal | System on publish |
| MEDIATION_IN_PROGRESS | Proposal rejected, new round | Party rejects |
| CLOSED | Both parties accepted | Both parties accept |
| PROCESSING_FAILED | AI pipeline failed | Celery on error |

## Valid Transitions (18 total)

| From State | To State | Triggered By |
|------------|----------|--------------|
| INVITED | PARTY_A_SUBMITTED | First party submits |
| INVITED | BOTH_SUBMITTED | Second party submits first |
| PARTY_A_SUBMITTED | BOTH_SUBMITTED | Second party submits |
| BOTH_SUBMITTED | BURST_1_PROCESSING | Celery task starts |
| BURST_1_PROCESSING | BURST_1_COMPLETE | Celery task completes |
| BURST_1_PROCESSING | PROCESSING_FAILED | Celery task fails |
| BURST_1_COMPLETE | QUESTIONNAIRE_ACTIVE | Mediator sends questions |
| QUESTIONNAIRE_ACTIVE | QUESTIONNAIRE_COMPLETE | All answers received |
| QUESTIONNAIRE_COMPLETE | BURST_2_PROCESSING | Celery task starts |
| BURST_2_PROCESSING | BURST_2_COMPLETE | Celery task completes |
| BURST_2_PROCESSING | PROCESSING_FAILED | Celery task fails |
| BURST_2_COMPLETE | PROPOSAL_PUBLISHED | Mediator publishes |
| PROPOSAL_PUBLISHED | PROPOSAL_UNDER_REVIEW | System on publish |
| PROPOSAL_UNDER_REVIEW | MEDIATION_IN_PROGRESS | Party rejects |
| PROPOSAL_UNDER_REVIEW | CLOSED | Both parties accept |
| MEDIATION_IN_PROGRESS | PROPOSAL_PUBLISHED | Mediator new round |
| PROCESSING_FAILED | BURST_1_PROCESSING | Retry Burst 1 |
| PROCESSING_FAILED | BURST_2_PROCESSING | Retry Burst 2 |

## PROCESSING_FAILED Recovery
When a case reaches PROCESSING_FAILED:
- Mediator sees error indicator on dashboard
- Admin manually triggers retry via Celery
- Case retries from the failed processing state
- Max 3 retries with 60 second delay between each

## Rule — No Direct Status Updates
No route handler ever sets case.status directly.
This is enforced by code review.
All status changes must call transition() function.