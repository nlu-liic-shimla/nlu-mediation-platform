# NLU Mediation Platform — Week 2 API Contract
# Version: 2.0 | Owner: Backend Role 1 | Date: [today]
# LOCKED after noon Day 1 — changes require team chat announcement

## Base URL
All routes: /api/v1/
Auth: Bearer token in Authorization header unless marked [unauthenticated]

---

## POST /api/v1/cases/{id}/submissions
Auth: requesting_party OR against_party
Content-Type: multipart/form-data

Fields:
  statement: string (required, min 50 chars)
  desired_outcome: string (required)
  monetary_amount: float (optional)
  timeline: string (required)
  relationship_type: enum [landlord_tenant | employer_employee | commercial | family | other]
  prior_negotiation: string (required) — send "true" or "false", not 1/0

Success: 201 { "id": "uuid", "case_id": "uuid", "submitted_at": "iso8601" }
Errors:
  409 { "error": true, "code": "SUBMISSION_ALREADY_EXISTS", "message": "..." }
  403 { "error": true, "code": "FORBIDDEN", "message": "..." }
  404 { "error": true, "code": "CASE_NOT_FOUND", "message": "..." }

---

## GET /api/v1/cases/{id}/submissions
Auth: mediator (sees both) | requesting_party/against_party (sees own only)

Success: 200 { "submissions": [ { "id", "party_id", "submitted_at", "statement" } ] }

---

## POST /api/v1/cases/{id}/invite
Auth: mediator only

Body (JSON): { "email": "string" }

Success: 201 { "token": "raw_token_shown_once", "expires_at": "iso8601", "invitation_id": "uuid" }
Errors:
  403 FORBIDDEN
  409 INVITATION_ALREADY_SENT

---

## GET /api/v1/invitations/{token}
Auth: [unauthenticated]

Success: 200 { "case_id", "dispute_type", "mediator_name", "status": "pending|expired|accepted" }
Errors:
  410 { "error": true, "code": "INVITATION_EXPIRED" }
  404 INVITATION_NOT_FOUND

---

## POST /api/v1/invitations/{token}/accept
Auth: [unauthenticated]

Body (JSON): { "email": "string", "password": "string" }
(Creates account if email doesn't exist, links if it does)

Success: 200 { "access_token": "jwt", "token_type": "bearer", "case_id": "uuid" }
Errors:
  410 INVITATION_EXPIRED
  409 INVITATION_ALREADY_ACCEPTED

---

## GET /api/v1/cases/{id}/analysis/status
Auth: mediator

Success: 200 {
  "status": "pending | processing | complete | failed",
  "started_at": "iso8601 or null",
  "completed_at": "iso8601 or null"
}

---

## PATCH /api/v1/cases/{id}/status  [INTERNAL ONLY]
Called only by state_machine.py — never directly from frontend

Body: { "new_state": "STATE_ENUM_VALUE" }

Success: 200 { "old_state": "...", "new_state": "...", "transitioned_at": "..." }
Errors:
  409 { "error": true, "code": "INVALID_TRANSITION", "message": "Cannot go from X to Y" }