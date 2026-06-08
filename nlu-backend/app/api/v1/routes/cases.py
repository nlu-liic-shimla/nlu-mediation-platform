# app/api/v1/routes/cases.py
# Updated: Week 3 Day 1 - aligned with Version 5.0 final flow
#
# KEY RULES enforced in this file:
#   1. case.status is NEVER set directly — always via transition()
#   2. Party access uses case_invitations table, NOT submissions table
#   3. created_by is ALWAYS mediator user_id
#   4. Parties always get 403 (never 404) on cross-case access
#   5. Party role = "party_user" — no more "requesting_party" / "against_party"

from fastapi import APIRouter, HTTPException, status, Depends, Form
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime

from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.models.cases import (
    CreateCaseRequest,
    CaseResponse,
    CaseListResponse,
    AnalysisStatusResponse,
    UpdateCaseNotesRequest,
    FlagClaimRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cases", tags=["Cases"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def verify_case_access(case_id: str, current_user: dict) -> dict:
    """
    Verify the current user has access to this case.
    Returns the case row if access is granted.
    Raises 403 (never 404) for party_user on wrong case — security through obscurity.
    Raises 404 only for mediator (they should know the case doesn't exist).
    """
    role = current_user["role"]
    user_id = current_user["user_id"]

    case_result = supabase.table("cases").select("*").eq("id", case_id).execute()

    if not case_result.data:
        if role == "mediator":
            raise HTTPException(status_code=404, detail={
                "error": True, "code": "CASE_NOT_FOUND"
            })
        else:
            # Party never learns whether case exists — always 403
            raise HTTPException(status_code=403, detail={
                "error": True, "code": "FORBIDDEN"
            })

    case = case_result.data[0]

    if role == "party_user":
        # Check party is on this case via case_invitations
        inv_check = supabase.table("case_invitations").select(
            "invitation_role"
        ).eq("case_id", case_id).eq("accepted_by", user_id).execute()

        if not inv_check.data:
            raise HTTPException(status_code=403, detail={
                "error": True, "code": "FORBIDDEN"
            })

    return case


# ── POST /cases ────────────────────────────────────────────────────────────────

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CreateCaseRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Path 2: Mediator creates case directly.
    created_by and assigned_mediator are ALWAYS set to the mediator's user_id.
    Status starts at BOTH_INVITED.
    """
    user_id = current_user["user_id"]

    new_case = {
        "dispute_type": request.dispute_type,
        "brief_description": request.brief_description,
        "status": "BOTH_INVITED",              # correct Version 5.0 initial state
        "created_by": user_id,                 # ALWAYS mediator
        "assigned_mediator": user_id,           # ALWAYS mediator
        "requesting_party_email": request.requesting_party_email,
        "against_party_email": request.against_party_email,
        "monetary_value": request.monetary_value,
        "negotiation_round": 0,
        "max_rounds": 3,
    }

    result = supabase.table("cases").insert(new_case).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "code": "CASE_CREATION_FAILED"}
        )

    return CaseResponse(**result.data[0])


# ── GET /cases ─────────────────────────────────────────────────────────────────

@router.get("", response_model=CaseListResponse)
async def list_cases(current_user: dict = Depends(get_current_user)):
    """
    Mediator: sees all cases assigned to them.
    party_user: sees cases via case_invitations table (both roles in any case).
                Each case includes your_role_in_this_case label.
    """
    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("cases").select("*").eq(
            "assigned_mediator", user_id
        ).order("created_at", desc=True).execute()

        cases = [CaseResponse(**row) for row in result.data] if result.data else []
        return CaseListResponse(cases=cases, total=len(cases))

    else:
        # party_user: look up cases via case_invitations
        # This correctly returns cases for BOTH requesting and against party roles
        invitations = supabase.table("case_invitations").select(
            "case_id, invitation_role"
        ).eq("accepted_by", user_id).execute()

        if not invitations.data:
            return CaseListResponse(cases=[], total=0)

        case_ids = [inv["case_id"] for inv in invitations.data]

        # Build role lookup map: case_id -> invitation_role
        role_map = {
            inv["case_id"]: inv["invitation_role"]
            for inv in invitations.data
        }

        result = supabase.table("cases").select("*").in_(
            "id", case_ids
        ).order("created_at", desc=True).execute()

        cases = []
        for row in (result.data or []):
            case = CaseResponse(**row)
            case.your_role_in_this_case = role_map.get(row["id"])
            cases.append(case)

        return CaseListResponse(cases=cases, total=len(cases))


# ── GET /cases/{case_id} ───────────────────────────────────────────────────────

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns case detail.
    Party access verified via case_invitations — 403 if not on this case.
    """
    case = verify_case_access(case_id, current_user)

    case_response = CaseResponse(**case)

    # Attach role label for party_user
    if current_user["role"] == "party_user":
        inv = supabase.table("case_invitations").select(
            "invitation_role"
        ).eq("case_id", case_id).eq(
            "accepted_by", current_user["user_id"]
        ).execute()

        if inv.data:
            case_response.your_role_in_this_case = inv.data[0]["invitation_role"]

    return case_response


# ── GET /cases/{case_id}/my-role ───────────────────────────────────────────────

@router.get("/{case_id}/my-role")
async def get_my_role(
    case_id: str,
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Returns whether the current party is requesting_party or against_party
    in this specific case. Frontend stores this in React component state.
    Called every time a party opens a case page.
    """
    user_id = current_user["user_id"]

    invitation = supabase.table("case_invitations").select(
        "invitation_role"
    ).eq("case_id", case_id).eq("accepted_by", user_id).execute()

    if not invitation.data:
        # Party not on this case — always 403 never 404
        raise HTTPException(status_code=403, detail={
            "error": True, "code": "FORBIDDEN"
        })

    return {
        "case_id": case_id,
        "role_in_this_case": invitation.data[0]["invitation_role"]
    }


# ── GET /cases/{case_id}/submissions ──────────────────────────────────────────

@router.get("/{case_id}/submissions")
async def list_submissions(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mediator: sees both submissions.
    party_user: sees only their own submission.
    """
    verify_case_access(case_id, current_user)

    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, submitted_at"
        ).eq("case_id", case_id).execute()
    else:
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, submitted_at"
        ).eq("case_id", case_id).eq("party_id", user_id).execute()

    return {"submissions": result.data if result.data else []}


# ── POST /cases/{case_id}/submissions ─────────────────────────────────────────

@router.post("/{case_id}/submissions", status_code=status.HTTP_201_CREATED)
async def create_submission(
    case_id: str,
    statement: str = Form(..., min_length=50),
    desired_outcome: str = Form(...),
    timeline: str = Form(...),
    relationship_type: str = Form(...),
    prior_negotiation: str = Form(...),
    monetary_amount: Optional[float] = Form(None),
    current_user: dict = Depends(require_role(["party_user"]))  # fixed: was requesting_party/against_party
):
    """
    Party submits their full statement via the 6-step intake wizard.
    Triggers state transition after each submission.
    Triggers Celery Burst 1 when both parties have submitted.
    """
    user_id = current_user["user_id"]

    # Verify party has access to this case via invitation
    verify_case_access(case_id, current_user)

    valid_types = [
        "landlord_tenant", "employer_employee",
        "business_partners", "neighbours",
        "contractor_client", "customer_business",
        "commercial", "family", "other"
    ]
    if relationship_type not in valid_types:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "code": "VALIDATION_ERROR",
                "message": f"relationship_type must be one of: {valid_types}"
            }
        )

    # Check for duplicate submission
    existing = supabase.table("submissions").select("id").eq(
        "case_id", case_id
    ).eq("party_id", user_id).execute()

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "SUBMISSION_ALREADY_EXISTS",
                "message": "You have already submitted for this case"
            }
        )

    # prior_negotiation arrives as string from multipart form — convert to bool
    prior_neg_bool = prior_negotiation.lower() in ("true", "1", "yes")

    now = datetime.utcnow().isoformat()

    insert_result = supabase.table("submissions").insert({
        "case_id": case_id,
        "party_id": user_id,
        "statement": statement,
        "desired_outcome": desired_outcome,
        "monetary_amount": monetary_amount,
        "timeline": timeline,
        "relationship_type": relationship_type,
        "prior_negotiation": prior_neg_bool,
        "submitted_at": now
    }).execute()

    submission_id = insert_result.data[0]["id"]

    # Count total submissions for this case to decide which transition to fire
    all_subs = supabase.table("submissions").select(
        "party_id"
    ).eq("case_id", case_id).execute()

    submission_count = len(all_subs.data)

    from app.core.state_machine import transition, CaseState

    if submission_count == 1:
        # First party submitted
        transition(case_id, CaseState.FIRST_PARTY_SUBMITTED, actor_id=user_id)

    elif submission_count >= 2:
        # Both parties submitted — trigger Burst 1
        transition(case_id, CaseState.BOTH_SUBMITTED, actor_id=user_id)

        try:
            from tasks import process_burst_1
            process_burst_1.delay(case_id)
            logger.info(f"Burst 1 triggered for case {case_id}")
        except Exception as e:
            logger.error(f"Failed to trigger Burst 1 Celery task for case {case_id}: {e}")
            # Do NOT raise — submission was saved successfully.
            # Celery failure is logged but doesn't fail the submission response.

    return {
        "id": submission_id,
        "case_id": case_id,
        "submitted_at": now,
        "message": "Submission received"
    }


# ── GET /cases/{case_id}/analysis/status ──────────────────────────────────────

@router.get("/{case_id}/analysis/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns Burst 1 pipeline status.
    Frontend polls this every 2 seconds during BURST_1_PROCESSING.
    Accessible by both mediator and party_user (party sees 'processing' / 'complete').
    """
    verify_case_access(case_id, current_user)

    try:
        analysis = supabase.table("ai_analysis").select(
            "completed_at, failed, started_at"
        ).eq("case_id", case_id).order(
            "created_at", desc=True
        ).limit(1).execute()
    except Exception:
        return AnalysisStatusResponse(status="pending")

    if not analysis.data:
        return AnalysisStatusResponse(status="pending")

    record = analysis.data[0]

    if record.get("failed"):
        return AnalysisStatusResponse(
            status="failed",
            started_at=record.get("started_at")
        )
    elif record.get("completed_at"):
        return AnalysisStatusResponse(
            status="complete",
            started_at=record.get("started_at"),
            completed_at=record["completed_at"]
        )
    else:
        return AnalysisStatusResponse(
            status="processing",
            started_at=record.get("started_at")
        )


# ── POST /cases/{case_id}/analysis/retry-full ─────────────────────────────────

@router.post("/{case_id}/analysis/retry-full")
async def retry_analysis(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Clears failed analysis and reruns full Burst 1 pipeline.
    Only callable when case is in PROCESSING_FAILED state.
    """
    from app.core.state_machine import transition, CaseState, get_current_state

    verify_case_access(case_id, current_user)

    current_state = get_current_state(case_id)

    if current_state != CaseState.PROCESSING_FAILED:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_TRANSITION",
                "message": f"Case must be in PROCESSING_FAILED to retry. Current state: {current_state.value}"
            }
        )

    # Clear old failed analysis record so status polling shows fresh state
    supabase.table("ai_analysis").delete().eq("case_id", case_id).execute()

    # Transition back to processing
    transition(case_id, CaseState.BURST_1_PROCESSING, actor_id=current_user["user_id"])

    # Fire Celery task again
    try:
        from tasks import process_burst_1
        process_burst_1.delay(case_id)
    except Exception as e:
        logger.error(f"Failed to trigger retry Celery task for case {case_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "code": "TASK_TRIGGER_FAILED",
                "message": "Could not start retry task"
            }
        )

    return {"status": "retrying", "case_id": case_id}


# ── POST /cases/{case_id}/analysis/flag ───────────────────────────────────────

@router.post("/{case_id}/analysis/flag")
async def flag_ai_claim(
    case_id: str,
    request: FlagClaimRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Mediator flags an AI claim they disagree with.
    Saved to ai_analysis_flags table.
    Flags are not fed back to AI in MVP — audit trail only.
    """
    verify_case_access(case_id, current_user)

    supabase.table("ai_analysis_flags").insert({
        "case_id": case_id,
        "claim_text": request.claim_text,
        "reason": request.reason,
        "flagged_by": current_user["user_id"],
        "flagged_at": datetime.utcnow().isoformat()
    }).execute()

    return {"flagged": True}


# ── PATCH /cases/{case_id}/notes ──────────────────────────────────────────────

@router.patch("/{case_id}/notes")
async def update_notes(
    case_id: str,
    request: UpdateCaseNotesRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Save mediator private notes.
    Never shown to parties.
    Fed to Sub-system H during proposal revision in Week 5.
    """
    verify_case_access(case_id, current_user)

    supabase.table("cases").update({
        "mediator_notes": request.notes,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", case_id).execute()

    return {"saved": True, "notes": request.notes}


# ── GET /cases/{case_id}/notes ─────────────────────
@router.get("/{case_id}/notes")
async def get_notes(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """Retrieve mediator private notes for a case."""
    case = verify_case_access(case_id, current_user)
    return {"notes": case.get("mediator_notes", "")}
# ← function ends here, no indentation below




    # ── ADD THIS ENDPOINT TO cases.py ─────────────────────────────────────────────
# Paste this at the BOTTOM of app/api/v1/routes/cases.py
# This is GET /cases/{case_id}/analysis — returns FULL AI results
# Different from GET /cases/{case_id}/analysis/status which returns only status
#
# Frontend 2 uses this to populate the AI analysis split screen:
# - neutral summary text
# - bias check badge (green/yellow/red)
# - mediatability score + 7-factor breakdown
# - tone analysis (mediator only)
# - conflict extraction claims

@router.get("/{case_id}/analysis")
async def get_analysis(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns full Burst 1 AI analysis results for a case.
    Mediator: sees everything including tone analysis.
    party_user: sees only neutral summary and mediatability band (no tone, no scores).

    Called by Frontend 2 to populate the AI analysis split screen.
    """
    verify_case_access(case_id, current_user)

    try:
        analysis = supabase.table("ai_analysis").select(
            "*"
        ).eq("case_id", case_id).order(
            "created_at", desc=True
        ).limit(1).execute()
    except Exception:
        return {"status": "pending", "data": None}

    if not analysis.data:
        return {"status": "pending", "data": None}

    record = analysis.data[0]
    role = current_user["role"]

    if record.get("failed"):
        return {"status": "failed", "data": None}

    if not record.get("completed_at"):
        return {"status": "processing", "data": None}

    # Build response based on role
    # Mediator sees everything
    # party_user sees limited view — no tone analysis, no numeric scores
    if role == "mediator":
        return {
            "status": "complete",
            "data": {
                "conflict_extraction": record.get("conflict_extraction"),
                "neutral_summary": record.get("neutral_summary"),
                "bias_removal": record.get("bias_removal"),
                "tone_analysis": record.get("tone_analysis"),   # mediator only
                "mediatability": record.get("mediatability"),
            },
            "started_at": record.get("started_at"),
            "completed_at": record.get("completed_at"),
        }
    else:
        # party_user — limited view
        # Never show: tone analysis, numeric scores, other party's data
        neutral = record.get("neutral_summary")
        mediatability = record.get("mediatability")

        return {
            "status": "complete",
            "data": {
                # Party sees the neutral summary
                "neutral_summary": neutral,
                # Party sees mediatability band only — not the numeric score
                "mediatability_band": mediatability.get("mediatability_band") if mediatability else None,
                # NO tone_analysis — mediator only
                # NO conflict_extraction — internal
                # NO bias_removal details — internal
            },
            "completed_at": record.get("completed_at"),
        }

        # ── PATH 1 ENDPOINTS ──────────────────────────────────────────────────────────
# Paste these at the BOTTOM of app/api/v1/routes/cases.py
# after the get_analysis endpoint
#
# Path 1: Party files application request → mediator reviews → accepts/rejects
# Path 2: Mediator creates case directly (already built above)
# Both paths unify at BOTH_INVITED state onwards


# ── POST /cases/apply ─────────────────────────────────────────────────────────

@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_mediation(
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Path 1: Party files an application request for mediation.
    Creates a record in application_requests table.
    Auto-assigns first available approved mediator.
    Party dashboard shows 'Waiting for mediator review.'
    Party can withdraw before mediator acts.
    """
    from pydantic import BaseModel
    from fastapi import Body

    # We need request body — define inline since this is a standalone endpoint
    # Frontend sends: dispute_type, brief_description, optional against party details
    raise HTTPException(
        status_code=501,
        detail={
            "error": True,
            "code": "NOT_IMPLEMENTED",
            "message": "Use request body. See apply_for_mediation_with_body endpoint."
        }
    )


class ApplicationRequest(BaseModel):
    dispute_type: str
    brief_description: str
    against_party_name: Optional[str] = None
    against_party_phone: Optional[str] = None
    against_party_email: Optional[str] = None
    monetary_value: Optional[float] = None


@router.post("/apply/submit", status_code=status.HTTP_201_CREATED)
async def submit_application(
    request: ApplicationRequest,
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Path 1: Party files application request for mediation.
    Auto-assigns first available approved mediator.
    Status starts at APPLICATION_PENDING.
    """
    user_id = current_user["user_id"]

    # Auto-assign first available approved mediator
    mediator_result = supabase.table("users").select(
        "id"
    ).eq("role", "mediator").eq(
        "verification_status", "approved"
    ).limit(1).execute()

    if not mediator_result.data:
        raise HTTPException(
            status_code=503,
            detail={
                "error": True,
                "code": "NO_MEDIATOR_AVAILABLE",
                "message": "No approved mediators available. Please try again later."
            }
        )

    assigned_mediator_id = mediator_result.data[0]["id"]

    now = datetime.utcnow().isoformat()

    result = supabase.table("application_requests").insert({
        "applicant_id": user_id,
        "dispute_type": request.dispute_type,
        "brief_description": request.brief_description,
        "against_party_name": request.against_party_name,
        "against_party_phone": request.against_party_phone,
        "against_party_email": request.against_party_email,
        "monetary_value": request.monetary_value,
        "status": "APPLICATION_PENDING",
        "assigned_mediator": assigned_mediator_id,
        "created_at": now,
    }).execute()

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "code": "APPLICATION_CREATION_FAILED"}
        )

    return {
        "id": result.data[0]["id"],
        "status": "APPLICATION_PENDING",
        "assigned_mediator_id": assigned_mediator_id,
        "message": "A mediator has been assigned. Waiting for mediator review."
    }


# ── PATCH /cases/{application_id}/accept ──────────────────────────────────────

@router.patch("/{application_id}/accept")
async def accept_application(
    application_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Path 1: Mediator accepts application request.
    Creates formal case record.
    Generates TWO invitation tokens (one per party).
    Returns one-time invitation links — never shown again.
    """
    import secrets
    import hashlib
    from datetime import timedelta, timezone

    mediator_id = current_user["user_id"]

    # Get application request
    app_result = supabase.table("application_requests").select(
        "*"
    ).eq("id", application_id).eq(
        "assigned_mediator", mediator_id
    ).execute()

    if not app_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "APPLICATION_NOT_FOUND"}
        )

    app = app_result.data[0]

    if app["status"] != "APPLICATION_PENDING":
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_STATE",
                "message": f"Application is not in PENDING state. Current: {app['status']}"
            }
        )

    now = datetime.utcnow().isoformat()

    # Create formal case — created_by is ALWAYS mediator
    case_result = supabase.table("cases").insert({
        "dispute_type": app["dispute_type"],
        "brief_description": app["brief_description"],
        "status": "BOTH_INVITED",
        "created_by": mediator_id,              # ALWAYS mediator
        "assigned_mediator": mediator_id,        # ALWAYS mediator
        "requesting_party_email": None,          # set from invitation
        "against_party_email": app.get("against_party_email"),
        "monetary_value": app.get("monetary_value"),
        "negotiation_round": 0,
        "max_rounds": 3,
        "created_at": now,
    }).execute()

    if not case_result.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "code": "CASE_CREATION_FAILED"}
        )

    case_id = case_result.data[0]["id"]

    # Update application status to ACCEPTED
    supabase.table("application_requests").update({
        "status": "ACCEPTED",
        "updated_at": now,
    }).eq("id", application_id).execute()

    # Generate TWO invitation tokens
    def make_token(role: str, email: Optional[str]):
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        expires_at = (
            datetime.now(timezone.utc) + timedelta(hours=72)
        ).isoformat()

        supabase.table("case_invitations").insert({
            "case_id": case_id,
            "invited_email": email or "",
            "token_hash": token_hash,
            "invitation_role": role,
            "expires_at": expires_at,
            "created_by": mediator_id,
            "invitation_attempt_count": 0,
        }).execute()

        return {"token": raw, "expires_at": expires_at}

    requesting_party_invite = make_token(
        "requesting_party",
        None  # applicant will get link separately
    )
    against_party_invite = make_token(
        "against_party",
        app.get("against_party_email")
    )

    # Audit log
    supabase.table("audit_logs").insert({
        "case_id": case_id,
        "actor_id": mediator_id,
        "action": "APPLICATION_ACCEPTED",
        "old_state": "APPLICATION_PENDING",
        "new_state": "BOTH_INVITED",
        "metadata": {
            "application_id": application_id,
            "case_created": case_id
        },
        "created_at": now
    }).execute()

    return {
        "case_id": case_id,
        "status": "BOTH_INVITED",
        "requesting_party_token": requesting_party_invite["token"],
        "requesting_party_expires_at": requesting_party_invite["expires_at"],
        "against_party_token": against_party_invite["token"],
        "against_party_expires_at": against_party_invite["expires_at"],
        "message": "Copy these links now — they will not be shown again."
    }


# ── PATCH /cases/{application_id}/reject ──────────────────────────────────────

@router.patch("/{application_id}/reject")
async def reject_application(
    application_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Path 1: Mediator rejects application with mandatory reason.
    Party sees reason on their dashboard with Apply Again button.
    """
    from pydantic import BaseModel

    class RejectRequest(BaseModel):
        rejection_reason: str   # mandatory per flow doc

    raise HTTPException(
        status_code=422,
        detail={
            "error": True,
            "code": "BODY_REQUIRED",
            "message": "Use POST body with rejection_reason field"
        }
    )


class RejectApplicationRequest(BaseModel):
    rejection_reason: str


@router.patch("/{application_id}/reject/submit")
async def reject_application_submit(
    application_id: str,
    request: RejectApplicationRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Path 1: Mediator rejects application with mandatory reason.
    """
    mediator_id = current_user["user_id"]

    app_result = supabase.table("application_requests").select(
        "*"
    ).eq("id", application_id).eq(
        "assigned_mediator", mediator_id
    ).execute()

    if not app_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "APPLICATION_NOT_FOUND"}
        )

    app = app_result.data[0]

    if app["status"] != "APPLICATION_PENDING":
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_STATE",
                "message": f"Application is not in PENDING state. Current: {app['status']}"
            }
        )

    now = datetime.utcnow().isoformat()

    supabase.table("application_requests").update({
        "status": "APPLICATION_REJECTED",
        "rejection_reason": request.rejection_reason,
        "updated_at": now,
    }).eq("id", application_id).execute()

    supabase.table("audit_logs").insert({
        "case_id": None,
        "actor_id": mediator_id,
        "action": "APPLICATION_REJECTED",
        "old_state": "APPLICATION_PENDING",
        "new_state": "APPLICATION_REJECTED",
        "metadata": {
            "application_id": application_id,
            "rejection_reason": request.rejection_reason
        },
        "created_at": now
    }).execute()

    return {
        "status": "APPLICATION_REJECTED",
        "rejection_reason": request.rejection_reason,
        "message": "Application rejected. Party will see reason on their dashboard."
    }


# ── PATCH /cases/{application_id}/withdraw ────────────────────────────────────

@router.patch("/{application_id}/withdraw")
async def withdraw_application(
    application_id: str,
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Path 1: Party withdraws their application before mediator acts.
    Only possible when status = APPLICATION_PENDING.
    """
    user_id = current_user["user_id"]

    app_result = supabase.table("application_requests").select(
        "*"
    ).eq("id", application_id).eq(
        "applicant_id", user_id
    ).execute()

    if not app_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "APPLICATION_NOT_FOUND"}
        )

    app = app_result.data[0]

    if app["status"] != "APPLICATION_PENDING":
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "CANNOT_WITHDRAW",
                "message": f"Cannot withdraw — application is already {app['status']}"
            }
        )

    now = datetime.utcnow().isoformat()

    supabase.table("application_requests").update({
        "status": "WITHDRAWN",
        "updated_at": now,
    }).eq("id", application_id).execute()

    supabase.table("audit_logs").insert({
        "case_id": None,
        "actor_id": user_id,
        "action": "APPLICATION_WITHDRAWN",
        "old_state": "APPLICATION_PENDING",
        "new_state": "WITHDRAWN",
        "metadata": {"application_id": application_id},
        "created_at": now
    }).execute()

    return {
        "status": "WITHDRAWN",
        "message": "Application withdrawn successfully."
    }


# ── GET /cases/applications ───────────────────────────────────────────────────

@router.get("/applications/pending")
async def list_pending_applications(
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Mediator: sees all pending application requests assigned to them.
    Shown in Pending Applications tab on mediator dashboard.
    """
    mediator_id = current_user["user_id"]

    result = supabase.table("application_requests").select(
        "*"
    ).eq("assigned_mediator", mediator_id).eq(
        "status", "APPLICATION_PENDING"
    ).order("created_at", desc=True).execute()

    return {
        "applications": result.data if result.data else [],
        "total": len(result.data) if result.data else 0
    }


@router.get("/applications/my")
async def list_my_applications(
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Party: sees all their own application requests and their statuses.
    """
    user_id = current_user["user_id"]

    result = supabase.table("application_requests").select(
        "*"
    ).eq("applicant_id", user_id).order(
        "created_at", desc=True
    ).execute()

    return {
        "applications": result.data if result.data else [],
        "total": len(result.data) if result.data else 0
    }