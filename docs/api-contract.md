# NLU Mediation Platform — API Contract
# Version: 4.0 | Owner: Backend Role 1 | Updated: Week 4
# Source of truth for all API endpoints across all weeks.
# Changes after Day 1 noon each week require team chat announcement.

---

## Base URL
All routes: /api/v1/
Auth: Authorization: Bearer <token> on all routes unless marked [unauthenticated]

---

## Standard Error Format
Every error response uses this exact shape.
Frontend always checks code field, never the message field.

{
  "error": true,
  "code": "ERROR_CODE_HERE",
  "message": "Human readable explanation"
}

## Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200  | Success (GET, PATCH) |
| 201  | Created (POST) |
| 401  | No JWT or JWT expired |
| 403  | Wrong role or wrong case — NEVER return 404 for auth failures |
| 404  | Resource genuinely does not exist |
| 409  | Conflict — duplicate, invalid state transition, rounds exhausted |
| 410  | Gone — invitation expired or already used |
| 422  | Validation error — request body failed validation |
| 500  | Server error — check uvicorn logs immediately |

---

# WEEK 1 — Authentication

## POST /api/v1/auth/register
Auth: [unauthenticated]

Body:
  email: string (required)
  password: string (required, min 8 chars)
  role: mediator | party_user (required)
  phone_number: string (required for mediator, optional for party_user)
  organization: string (required for mediator only)

Success: 201
  { "message": "User created successfully", "email": "string", "role": "string" }

Errors:
  409 EMAIL_ALREADY_EXISTS
  422 VALIDATION_ERROR

Notes:
  mediator: verification_status = approved by default for MVP
  party_user: verification_status not applicable

---

## POST /api/v1/auth/login
Auth: [unauthenticated]

Body: { "email": "string", "password": "string" }

Success: 200
  { "access_token": "jwt_string", "token_type": "bearer", "role": "mediator|party_user" }

Errors:
  401 INVALID_CREDENTIALS

---

## GET /api/v1/auth/me
Auth: any authenticated user

Success: 200
  { "id": "uuid", "email": "string", "role": "string" }

---

# WEEK 2 — Cases and Submissions

## POST /api/v1/cases
Auth: mediator only
Description: Path 2 — mediator creates case directly. Two invitation tokens generated immediately.

Body:
  dispute_type: landlord_tenant|employment|commercial|property|family|construction|consumer|debt|other
  brief_description: string (min 20, max 500)
  requesting_party_email: string (optional)
  against_party_email: string (optional)
  monetary_value: float (optional)

Success: 201
  {
    "case_id": "uuid",
    "status": "BOTH_INVITED",
    "invitation_tokens": {
      "requesting_party": "raw_token_shown_once",
      "against_party": "raw_token_shown_once"
    }
  }

Errors:
  403 FORBIDDEN

---

## POST /api/v1/cases/apply
Auth: party_user
Description: Path 1 — party files application request. Mediator reviews before case is created.

Body:
  dispute_type: string (enum, required)
  brief_description: string (min 20, max 500, required)
  against_party_name: string (optional)
  against_party_phone: string (optional)
  against_party_email: string (optional)
  monetary_value: float (optional)

Success: 201
  { "application_id": "uuid", "status": "APPLICATION_PENDING" }

---

## PATCH /api/v1/cases/{application_id}/accept
Auth: mediator only
Description: Formally creates case, generates both invitation tokens.

Success: 200
  {
    "case_id": "uuid",
    "status": "BOTH_INVITED",
    "invitation_tokens": {
      "requesting_party": "raw_token_shown_once",
      "against_party": "raw_token_shown_once"
    }
  }

---

## PATCH /api/v1/cases/{application_id}/reject
Auth: mediator only

Body: { "reason": "string (required)" }

Success: 200 { "status": "APPLICATION_REJECTED" }

---

## PATCH /api/v1/cases/{application_id}/withdraw
Auth: party_user (applicant only)

Success: 200 { "status": "WITHDRAWN" }

---

## GET /api/v1/cases
Auth: mediator (all their cases) | party_user (cases via case_invitations)

Success: 200
  {
    "cases": [
      {
        "id": "uuid",
        "status": "string",
        "dispute_type": "string",
        "created_at": "iso8601",
        "your_role_in_this_case": "requesting_party|against_party|null"
      }
    ]
  }

---

## GET /api/v1/cases/{case_id}
Auth: mediator | party_user (must be on this case)

Success: 200 — full case object

Errors:
  403 FORBIDDEN — always 403, never 404 for wrong-case access

---

## GET /api/v1/cases/{case_id}/my-role
Auth: party_user
Description: Returns this user's role in this specific case.

Success: 200 { "role_in_this_case": "requesting_party|against_party" }

Errors: 403 FORBIDDEN

---

## POST /api/v1/cases/{case_id}/submissions
Auth: party_user on this case
Content-Type: multipart/form-data

Fields:
  statement: string (required, min 50 chars)
  desired_outcome: string (required)
  monetary_amount: float (optional)
  timeline: string (required)
  relationship_type: enum (required)
  prior_negotiation: string (required) — send "true" or "false"

Success: 201 { "id": "uuid", "case_id": "uuid", "submitted_at": "iso8601" }

Errors:
  409 SUBMISSION_ALREADY_EXISTS
  403 FORBIDDEN
  404 CASE_NOT_FOUND

---

## GET /api/v1/cases/{case_id}/submissions
Auth: mediator (both) | party_user (own only via RLS)

Success: 200 { "submissions": [ { "id", "party_id", "submitted_at", "statement" } ] }

---

## GET /api/v1/cases/{case_id}/analysis/status
Auth: mediator
Description: Frontend polls every 5 seconds during BURST_1_PROCESSING.

Success: 200
  {
    "status": "pending|processing|complete|failed",
    "started_at": "iso8601 or null",
    "completed_at": "iso8601 or null"
  }

---

# WEEK 3 — Invitations and AI Analysis

## POST /api/v1/cases/{case_id}/invite
Auth: mediator only
Description: Generate invitation token. SHA-256 hash stored — raw token shown once.

Body: { "email": "string", "invitation_role": "requesting_party|against_party" }

Success: 201 { "token": "raw_token_shown_once", "expires_at": "iso8601" }

Errors:
  403 FORBIDDEN
  409 INVITATION_ALREADY_SENT

---

## GET /api/v1/invitations/{token}
Auth: [unauthenticated]
Description: Preview invitation. Returns 410 if expired or used — never reveals case details then.

Success: 200
  {
    "case_id": "uuid",
    "dispute_type": "string",
    "mediator_name": "string",
    "brief_description": "string",
    "status": "pending|expired|accepted"
  }

Errors:
  410 INVITATION_EXPIRED
  404 INVITATION_NOT_FOUND

---

## POST /api/v1/invitations/{token}/accept
Auth: [unauthenticated]
Description: Atomic — validate token, create/link user, record consent, mark accepted, return JWT.

Body: { "email": "string", "password": "string", "full_name": "string" }

Success: 200
  {
    "access_token": "jwt",
    "token_type": "bearer",
    "case_id": "uuid",
    "role_in_case": "requesting_party|against_party"
  }

Errors:
  410 INVITATION_EXPIRED
  409 INVITATION_ALREADY_ACCEPTED

---

## POST /api/v1/invitations/{token}/decline
Auth: [unauthenticated]

Success: 200 { "status": "declined" }

---

## POST /api/v1/cases/{case_id}/invitations/regenerate
Auth: mediator only
Description: Invalidates old token immediately. New token shown once. Logged to audit trail.

Body: { "invitation_role": "requesting_party|against_party" }

Success: 200 { "token": "new_raw_token_shown_once", "expires_at": "iso8601" }

---

## GET /api/v1/cases/{case_id}/analysis
Auth: mediator
Description: Full Burst 1 AI results — all 5 sub-systems.

Success: 200
  {
    "status": "complete|pending|failed",
    "conflict_extraction": { "dispute_type", "core_dispute", "claims_party_a", "claims_party_b", "extraction_confidence" },
    "neutral_summary": { "content", "bias_check_result": "none|corrected|unresolved" },
    "mediatability": { "total_score", "band", "factor_breakdown", "justification" },
    "tone_analysis": { "requesting_party": { "hostility_score", "openness_score" }, "against_party": { ... } },
    "bias_removal": { "bias_detected": true|false, "revised": true|false }
  }

---

## POST /api/v1/cases/{case_id}/analysis/retry-full
Auth: mediator
Description: Clears Burst 1 results, transitions to BURST_1_PROCESSING, reruns full pipeline.

Success: 200 { "status": "retrying" }

---

## POST /api/v1/cases/{case_id}/analysis/flag
Auth: mediator

Body: { "claim_text": "string", "reason": "string (optional)" }

Success: 201 { "flag_id": "uuid" }

---

## GET /api/v1/cases/{case_id}/documents
Auth: mediator only
Description: All party documents with signed URLs grouped by party.

Success: 200
  {
    "requesting_party": [ { "filename", "file_size", "signed_url", "uploaded_at" } ],
    "against_party": [ { "filename", "file_size", "signed_url", "uploaded_at" } ]
  }

---

## PATCH /api/v1/cases/{case_id}/notes
Auth: mediator only
Description: Private notes — never shown to parties. Fed to Sub-system H on revision.

Body: { "notes": "string" }

Success: 200 { "status": "saved" }

---

## GET /api/v1/cases/{case_id}/notes
Auth: mediator only

Success: 200 { "notes": "string" }

---

# WEEK 4 — Questionnaire, BATNA/WATNA, Proposals, Settlement

## POST /api/v1/cases/{case_id}/questionnaires
Auth: mediator only
Description: Calls Sub-system C. Case must be BURST_1_COMPLETE. No body needed.

Success: 201 { "questionnaire_id": "uuid", "status": "questionnaire_active" }

Errors:
  409 INVALID_CASE_STATE — must be BURST_1_COMPLETE
  400 ANALYSIS_MISSING — Burst 1 not complete

---

## GET /api/v1/cases/{case_id}/questionnaires/{q_id}
Auth: mediator | party_user
Description:
  Mediator: all questions including purpose field
  Party: only questions directed at their role, purpose field stripped

Success: 200
  {
    "questionnaire_id": "uuid",
    "questions": [
      { "id": "q1", "question_text": "string", "question_type": "open_ended|yes_no|scale_1_5", "directed_at": "requesting_party|against_party|both" }
    ],
    "total": 10
  }

---

## POST /api/v1/cases/{case_id}/questionnaires/{q_id}/responses
Auth: party_user only
Description: Submit answers. When both parties answer, auto-transitions to QUESTIONNAIRE_COMPLETE
and fires Burst 2 Celery task.

Body: { "answers": { "q1": "answer", "q2": "yes" } }

Success: 201

One party answered:
  { "status": "submitted", "waiting_for_other_party": true, "responses_received": 1, "responses_needed": 2 }

Both answered (Burst 2 triggered):
  { "status": "questionnaire_complete", "burst_2_triggered": true }

Errors:
  409 ALREADY_SUBMITTED
  403 NOT_A_PARTY

---

## GET /api/v1/cases/{case_id}/questionnaires/{q_id}/responses
Auth: mediator only
Description: Both parties' answers side by side. Powers three-column comparison table.

Success: 200
  {
    "questionnaire_id": "uuid",
    "questions": [ { "id", "question_text" } ],
    "responses": [
      { "party_role": "requesting_party", "answers": {}, "submitted_at": "iso8601" },
      { "party_role": "against_party", "answers": {}, "submitted_at": "iso8601" }
    ],
    "both_answered": true
  }

---

## GET /api/v1/cases/{case_id}/analysis/batna-watna
Auth: mediator | party_user
Description: Role-filtered. Parties NEVER see numeric scores, settlement zone, or other party data.

Mediator response:
  {
    "status": "complete",
    "requesting_party": { "batna_score": 8, "watna_score": 5, "batna_label": "Strong", "watna_label": "Moderate", "batna_reasoning": "...", "watna_reasoning": "...", "negotiation_guidance": "..." },
    "against_party": { ...same fields... },
    "overall_settlement_zone": "INR 30,000 to INR 45,000",
    "disclaimer": "string"
  }

Party response (labels only):
  {
    "status": "complete",
    "your_position": { "batna_label": "Strong", "batna_reasoning": "...", "watna_label": "Moderate", "watna_reasoning": "...", "negotiation_guidance": "...", "consult_solicitor_flag": false },
    "disclaimer": "This analysis provides negotiation guidance only and does not constitute legal advice."
  }

If consult_solicitor_flag = true (party sees):
  { "status": "complete", "your_position": { "consult_solicitor_flag": true, "message": "The jurisdictional aspects of your case are unclear. We recommend consulting a solicitor before proceeding." }, "disclaimer": "string" }

Pending (Burst 2 not complete):
  { "status": "pending", "current_case_status": "string", "message": "string" }

---

## POST /api/v1/cases/{case_id}/proposals
Auth: mediator only
Description: Creates proposal with AI-generated draft. No body needed.
Case must be BURST_2_COMPLETE or MEDIATION_IN_PROGRESS.

Success: 201
  { "proposal_id": "uuid", "draft_text": "string", "round": 1, "status": "draft" }

Errors:
  409 INVALID_CASE_STATE

---

## PATCH /api/v1/cases/{case_id}/proposals/{proposal_id}
Auth: mediator only

Body: { "content": "string" }

Success: 200 { "status": "saved", "proposal_id": "uuid" }

---

## POST /api/v1/cases/{case_id}/proposals/{proposal_id}/publish
Auth: mediator only
Description: Publishes proposal. Increments negotiation_round. Guards max_rounds.

Success: 200 { "status": "published", "proposal_id": "uuid", "round": 1 }

Errors:
  409 ROUNDS_EXHAUSTED — use extend-rounds first

---

## POST /api/v1/cases/{case_id}/proposals/{proposal_id}/respond
Auth: party_user only
Description:
  Both accepted → MEDIATION_COMPLETE
  Any rejected → MEDIATION_IN_PROGRESS + Sub-system H fires

Body:
  { "decision": "accepted|rejected", "rejection_reason": "string (required if rejected, min 20 chars)" }

Success: 201

Both accepted: { "status": "mediation_complete", "message": "Both parties accepted. The mediator has been notified to finalise the case." }
Any rejected:  { "status": "mediation_in_progress", "revision_triggered": true, "message": "Proposal rejected. The mediator will prepare a revised proposal." }
Waiting:       { "status": "response_recorded", "waiting": true, "message": "Your response has been recorded. Waiting for the other party." }

Errors:
  422 REJECTION_REASON_TOO_SHORT — min 20 chars
  409 ALREADY_RESPONDED

---

## GET /api/v1/cases/{case_id}/proposals
Auth: mediator | party_user
Description:
  Mediator: all proposals regardless of status
  Party: published only (enforced by app logic AND RLS)

Success: 200 — array of proposal objects

---

## POST /api/v1/cases/{case_id}/proposals/extend-rounds
Auth: mediator only
Description: Extends max_rounds by 1. Reason mandatory. Permanently logged to audit trail.

Body: { "reason": "string (required, not empty)" }

Success: 200 { "new_max_rounds": 4, "reason_logged": true }

Errors:
  422 REASON_REQUIRED

---

## POST /api/v1/cases/{case_id}/finalise
Auth: mediator only
Description: Mediator formally finalises case. Status stays MEDIATION_COMPLETE (self-transition).
Audit log records mediator's action. Parties see settlement confirmation screen.

Success: 200 { "status": "finalised", "message": "Both parties have been notified to confirm the settlement." }

Errors:
  409 INVALID_CASE_STATE — case must be MEDIATION_COMPLETE

---

## POST /api/v1/cases/{case_id}/settlement/confirm
Auth: party_user only
Owner: Backend Role 2 (Niharika)
Content-Type: multipart/form-data

Fields:
  typed_name: string (required)
  signature_image: file JPG|PNG max 2MB (required)

Success: 201 { "status": "confirmed" }

---

## GET /api/v1/cases/{case_id}/settlement/status
Auth: any authenticated user on this case
Description: Frontend polls every 3 seconds to activate PDF download button.

Success: 200
  {
    "requesting_party": { "confirmed": true, "confirmed_at": "iso8601" },
    "against_party": { "confirmed": false, "confirmed_at": null },
    "pdf_ready": false,
    "pdf_url": null
  }

---

## GET /api/v1/cases/{case_id}/settlement/pdf
Auth: any authenticated user on this case

Success: 200 { "pdf_url": "signed_url_valid_24_hours" }

Errors:
  404 PDF_NOT_READY — both parties have not confirmed yet

---

## GET /api/v1/cases/{case_id}/audit-log
Auth: mediator only
Description: Full insert-only event history. Most recent first. Read only.

Success: 200
  [
    {
      "action": "STATE_TRANSITION",
      "old_state": "PROPOSAL_PUBLISHED",
      "new_state": "MEDIATION_COMPLETE",
      "actor_id": "uuid",
      "metadata": { "triggered_by": "system", "negotiation_round": 1 },
      "created_at": "iso8601"
    }
  ]

---

## INTERNAL — state_machine.py only
## PATCH /api/v1/cases/{case_id}/status
Called ONLY by transition() in state_machine.py. Never from any route handler or frontend.

Body: { "new_state": "STATE_ENUM_VALUE" }

Success: 200 { "old_state": "string", "new_state": "string", "transitioned_at": "iso8601" }

Errors:
  409 INVALID_TRANSITION