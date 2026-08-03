# app/api/v1/routes/cases.py
# Updated: Week 3 Day 1 - aligned with Version 5.0 final flow
# Updated again: Bug fixes #13, #15, #18 (see FIX comments below)
#
# KEY RULES enforced in this file:
#   1. case.status is NEVER set directly — always via transition()
#   2. Party access uses case_invitations table, NOT submissions table
#   3. created_by is ALWAYS mediator user_id
#   4. Parties always get 403 (never 404) on cross-case access
#   5. Party role = "party_user" — no more "requesting_party" / "against_party"
#   6. Mediator-internal fields (created_by, assigned_mediator, mediator_notes)
#      are NEVER returned to party_user — see FIX #15 below

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
    For mediators, also checks application_requests table as fallback
    (applications are not yet in the cases table).
    Raises 403 (never 404) for party_user on wrong case — security through obscurity.
    Raises 404 only for mediator (they should know the case doesn't exist).
    """
    role = current_user["role"]
    user_id = current_user["user_id"]

    case_result = supabase.table("cases").select("*").eq("id", case_id).execute()

    if not case_result.data:
        if role == "mediator":
            app_result = supabase.table("application_requests").select("*").eq(
                "id", case_id
            ).eq("assigned_mediator", user_id).execute()

            if app_result.data:
                app = app_result.data[0]
                return {
                    "id": app["id"],
                    "dispute_type": app.get("dispute_type"),
                    "brief_description": app.get("brief_description"),
                    "status": app.get("status", "APPLICATION_PENDING"),
                    "created_by": user_id,
                    "assigned_mediator": user_id,
                    "requesting_party_email": None,
                    "against_party_email": app.get("against_party_email"),
                    "negotiation_round": 0,
                    "max_rounds": 3,
                    "mediator_notes": None,
                    "created_at": app.get("created_at"),
                    "updated_at": app.get("updated_at"),
                    "_is_application": True,
                    "_applicant_id": app.get("applicant_id"),
                    "_against_party_name": app.get("against_party_name"),
                    "_monetary_value": app.get("monetary_value"),
                }

            raise HTTPException(status_code=404, detail={
                "error": True, "code": "CASE_NOT_FOUND"
            })
        else:
            raise HTTPException(status_code=403, detail={
                "error": True, "code": "FORBIDDEN"
            })

    case = case_result.data[0]

    if role == "party_user":
        inv_check = supabase.table("case_invitations").select(
            "invitation_role"
        ).eq("case_id", case_id).eq("accepted_by", user_id).execute()

        if not inv_check.data:
            raise HTTPException(status_code=403, detail={
                "error": True, "code": "FORBIDDEN"
            })

    return case


# ── FIX #15 helper: strip mediator-internal fields before returning to party ──

def _strip_mediator_fields(data: dict) -> dict:
    """
    Removes fields that must never be exposed to party_user.
    Applied to every response dict/model before it goes back to a party.
    """
    for field in ("created_by", "assigned_mediator", "mediator_notes"):
        data.pop(field, None)
    return data


def _write_audit_log_safe(payload: dict):
    """
    FIX #13: Wraps every audit_logs insert in try/except so that a
    schema mismatch fails loudly in the logs but never breaks the
    user-facing action that triggered it.
    """
    try:
        supabase.table("audit_logs").insert(payload).execute()
    except Exception as e:
        logger.error(f"Audit log insert failed (action={payload.get('action')}): {e}")


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
        "status": "BOTH_INVITED",
        "created_by": user_id,
        "assigned_mediator": user_id,
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
    """
    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("cases").select("*").eq(
            "assigned_mediator", user_id
        ).order("created_at", desc=True).execute()

        cases = [CaseResponse(**row) for row in result.data] if result.data else []

        app_result = supabase.table("application_requests").select("*").eq(
            "assigned_mediator", user_id
        ).order("created_at", desc=True).execute()

        for app in (app_result.data or []):
            cases.append(CaseResponse(
                id=app["id"],
                dispute_type=app.get("dispute_type"),
                brief_description=app.get("brief_description"),
                status=app.get("status", "APPLICATION_PENDING"),
                created_by=user_id,
                assigned_mediator=user_id,
                requesting_party_email=None,
                against_party_email=app.get("against_party_email"),
                created_at=app.get("created_at"),
                updated_at=app.get("updated_at"),
            ))

        return CaseListResponse(cases=cases, total=len(cases))

    else:
        invitations = supabase.table("case_invitations").select(
            "case_id, invitation_role"
        ).eq("accepted_by", user_id).execute()

        if not invitations.data:
            return CaseListResponse(cases=[], total=0)

        case_ids = [inv["case_id"] for inv in invitations.data]

        role_map = {
            inv["case_id"]: inv["invitation_role"]
            for inv in invitations.data
        }

        result = supabase.table("cases").select("*").in_(
            "id", case_ids
        ).order("created_at", desc=True).execute()

        cases = []
        for row in (result.data or []):
            row_copy = dict(row)
            _strip_mediator_fields(row_copy)
            case = CaseResponse(**row_copy)
            case.your_role_in_this_case = role_map.get(row["id"])
            cases.append(case)

        return CaseListResponse(cases=cases, total=len(cases))


# ── GET /cases/{case_id} ───────────────────────────────────────────────────────

@router.get("/{case_id}")
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns enriched case detail.
    FIX #15: party_user no longer receives created_by, assigned_mediator,
    or mediator_notes — stripped right before return.
    """
    case = verify_case_access(case_id, current_user)

    response = {
        "id": case["id"],
        "dispute_type": case.get("dispute_type"),
        "brief_description": case.get("brief_description"),
        "status": case["status"],
        "created_by": case.get("created_by"),
        "assigned_mediator": case.get("assigned_mediator"),
        "requesting_party_email": case.get("requesting_party_email"),
        "against_party_email": case.get("against_party_email"),
        "negotiation_round": case.get("negotiation_round", 0),
        "max_rounds": case.get("max_rounds", 3),
        "mediator_notes": case.get("mediator_notes"),
        "finalised_at": case.get("finalised_at"),  # BUG #31 FIX
        "created_at": case.get("created_at"),
        "updated_at": case.get("updated_at"),
        "title": case.get("brief_description") or case.get("dispute_type") or "Untitled Case",
        "case_type": case.get("dispute_type"),
        "party_a_submitted": False,
        "party_b_submitted": False,
        "party_a_name": None,
        "party_b_name": None,
        "requesting_party_token": None,
        "against_party_token": None,
        "requesting_party_token_expires": None,
        "against_party_token_expires": None,
        "your_role_in_this_case": None,
    }

    if case.get("_is_application"):
        applicant_id = case.get("_applicant_id")
        if applicant_id:
            applicant = supabase.table("users").select(
                "email, full_name"
            ).eq("id", applicant_id).execute()
            if applicant.data:
                response["requesting_party_email"] = applicant.data[0].get("email")
                response["party_a_name"] = applicant.data[0].get("full_name") or applicant.data[0].get("email")
        response["against_party_name"] = case.get("_against_party_name")
        response["monetary_value"] = case.get("_monetary_value")

        if current_user["role"] == "party_user":
            _strip_mediator_fields(response)

        return response

    invitations = supabase.table("case_invitations").select(
        "id, invitation_role, accepted_by, accepted_at, token_hash, expires_at"
    ).eq("case_id", case_id).execute()

    inv_data = invitations.data or []

    for inv in inv_data:
        role_label = inv.get("invitation_role")
        accepted_by = inv.get("accepted_by")
        accepted_at = inv.get("accepted_at")

        if accepted_by:
            sub_check = supabase.table("submissions").select("id").eq(
                "case_id", case_id
            ).eq("party_id", accepted_by).execute()

            submitted = bool(sub_check.data)

            user_result = supabase.table("users").select(
                "full_name, email"
            ).eq("id", accepted_by).execute()

            party_name = None
            if user_result.data:
                party_name = (
                    user_result.data[0].get("full_name")
                    or user_result.data[0].get("email")
                )

            if role_label == "requesting_party":
                response["party_a_submitted"] = submitted
                response["party_a_name"] = party_name
            elif role_label == "against_party":
                response["party_b_submitted"] = submitted
                response["party_b_name"] = party_name

    if current_user["role"] == "mediator":
        for inv in inv_data:
            if not inv.get("accepted_at"):
                role_label = inv.get("invitation_role")
                inv_id = inv.get("id")
                expires_at = inv.get("expires_at")

                if role_label == "requesting_party":
                    response["requesting_party_invitation_id"] = inv_id
                    response["requesting_party_token_expires"] = expires_at
                    response["requesting_party_token"] = inv_id
                elif role_label == "against_party":
                    response["against_party_invitation_id"] = inv_id
                    response["against_party_token_expires"] = expires_at
                    response["against_party_token"] = inv_id

    if current_user["role"] == "party_user":
        for inv in inv_data:
            if inv.get("accepted_by") == current_user["user_id"]:
                response["your_role_in_this_case"] = inv.get("invitation_role")
                break

    response["user_has_submitted_questionnaire"] = False
    if current_user["role"] == "party_user":
        q_list = supabase.table("questionnaires").select("id").eq("case_id", case_id).order("created_at", desc=True).limit(1).execute()
        if q_list.data:
            latest_q_id = q_list.data[0]["id"]
            resp_check = supabase.table("questionnaire_responses") \
                .select("id") \
                .eq("questionnaire_id", latest_q_id) \
                .eq("respondent_id", current_user["user_id"]) \
                .execute()
            response["user_has_submitted_questionnaire"] = bool(resp_check.data)

    if current_user["role"] == "party_user":
        _strip_mediator_fields(response)

    return response


# ── GET /cases/{case_id}/my-role ───────────────────────────────────────────────

@router.get("/{case_id}/my-role")
async def get_my_role(
    case_id: str,
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Returns whether the current party is requesting_party or against_party
    in this specific case.
    """
    user_id = current_user["user_id"]

    invitation = supabase.table("case_invitations").select(
        "invitation_role"
    ).eq("case_id", case_id).eq("accepted_by", user_id).execute()

    if not invitation.data:
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
    Mediator: sees both submissions enriched with invitation_role.
    party_user: sees only their own submission.
    """
    verify_case_access(case_id, current_user)

    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, statement, "
            "desired_outcome, monetary_amount, timeline, "
            "prior_negotiation, submitted_at"
        ).eq("case_id", case_id).order("submitted_at").execute()

        submissions = result.data or []

        for sub in submissions:
            inv = supabase.table("case_invitations").select(
                "invitation_role, invited_email"
            ).eq("case_id", case_id).eq(
                "accepted_by", sub["party_id"]
            ).execute()

            if inv.data:
                sub["invitation_role"] = inv.data[0]["invitation_role"]
                sub["party_email"] = inv.data[0]["invited_email"]
            else:
                sub["invitation_role"] = None
                sub["party_email"] = None

    else:
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, submitted_at"
        ).eq("case_id", case_id).eq("party_id", user_id).execute()
        submissions = result.data or []

    return {"submissions": submissions}


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
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Party submits their full statement via the 6-step intake wizard.
    """
    user_id = current_user["user_id"]

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

    all_subs = supabase.table("submissions").select(
        "party_id"
    ).eq("case_id", case_id).execute()

    submission_count = len(all_subs.data)

    from app.core.state_machine import transition, CaseState

    if submission_count == 1:
        transition(case_id, CaseState.FIRST_PARTY_SUBMITTED, actor_id=user_id)

    elif submission_count >= 2:
        transition(case_id, CaseState.BOTH_SUBMITTED, actor_id=user_id)

        try:
            from tasks import process_burst_1
            process_burst_1.delay(case_id)
            logger.info(f"Burst 1 triggered for case {case_id}")
        except Exception as e:
            logger.error(f"Failed to trigger Burst 1 Celery task for case {case_id}: {e}")

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

    supabase.table("ai_analysis").delete().eq("case_id", case_id).execute()

    transition(case_id, CaseState.BURST_1_PROCESSING, actor_id=current_user["user_id"])

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


@router.delete("/{case_id}/analysis/flag")
async def unflag_ai_claim(
    case_id: str,
    request: FlagClaimRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Mediator removes a flag they previously set.
    """
    verify_case_access(case_id, current_user)

    supabase.table("ai_analysis_flags").delete().eq(
        "case_id", case_id
    ).eq(
        "claim_text", request.claim_text
    ).eq(
        "flagged_by", current_user["user_id"]
    ).execute()

    return {"unflagged": True}


@router.get("/{case_id}/invitation-status")
async def get_invitation_status(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    verify_case_access(case_id, current_user)

    invitations = supabase.table("case_invitations").select(
        "invitation_role, accepted_at, accepted_by, "
        "invitation_attempt_count, declined_at"
    ).eq("case_id", case_id).execute()

    result = {
        "requesting_party": {
            "link_generated": False,
            "accepted": False,
            "attempt_count": 0,
        },
        "against_party": {
            "link_generated": False,
            "accepted": False,
            "attempt_count": 0,
        }
    }

    for inv in (invitations.data or []):
        role_key = inv.get("invitation_role")
        if role_key not in result:
            continue
        result[role_key]["link_generated"] = True
        if inv.get("accepted_at"):
            result[role_key]["accepted"] = True
        result[role_key]["attempt_count"] += (inv.get("invitation_attempt_count") or 0)

    return result



@router.get("/{case_id}/analysis/flags")
async def get_flags(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """Returns all flags the mediator has set for this case."""
    verify_case_access(case_id, current_user)

    result = supabase.table("ai_analysis_flags").select(
        "claim_text"
    ).eq("case_id", case_id).eq(
        "flagged_by", current_user["user_id"]
    ).execute()

    return {"flags": [{"claim_text": row["claim_text"]} for row in (result.data or [])]}


# ── GET /cases/{case_id}/analysis ─────────────────────────────────────────────

@router.get("/{case_id}/analysis")
async def get_analysis(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns full Burst 1 AI analysis results for a case.
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

    if role == "mediator":
        return {
            "status": "complete",
            "data": {
                "conflict_extraction": record.get("conflict_extraction"),
                "neutral_summary": record.get("neutral_summary"),
                "bias_removal": record.get("bias_removal"),
                "tone_analysis": record.get("tone_analysis"),
                "mediatability": record.get("mediatability"),
            },
            "started_at": record.get("started_at"),
            "completed_at": record.get("completed_at"),
        }
    else:
        neutral = record.get("neutral_summary")
        mediatability = record.get("mediatability")

        return {
            "status": "complete",
            "data": {
                "neutral_summary": neutral,
                "mediatability_band": mediatability.get("mediatability_band") if mediatability else None,
            },
            "completed_at": record.get("completed_at"),
        }


# ── PATH 1: APPLICATION REQUEST ENDPOINTS ─────────────────────────────────────
# FIX #13 / #18: See notes at each endpoint.


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
    FIX #13: writes an APPLICATION_FILED audit log entry using
    application_id as case_id, so GET /cases/{id}/audit-log can find it.
    """
    user_id = current_user["user_id"]

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

    application_id = result.data[0]["id"]

    _write_audit_log_safe({
        "case_id": None,
        "application_id": application_id,   # FIX #13 v2: separate FK-safe column
        "actor_id": user_id,
        "action": "APPLICATION_FILED",
        "old_state": None,
        "new_state": "APPLICATION_PENDING",
        "metadata": {
            "application_id": application_id,
            "assigned_mediator": assigned_mediator_id,
        },
        "created_at": now
    })

    return {
        "id": application_id,
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
    Creates formal case record. Generates TWO invitation tokens.

    FIX (related to #20): the applicant already has an account and
    should never need to "accept" their own invitation through the
    public accept_invitation flow. Their requesting_party invitation
    is now auto-marked as accepted right here, using their existing
    applicant_id — no link needs to be clicked for them.
    """
    import secrets
    import hashlib
    from datetime import timedelta, timezone

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

    applicant_result = supabase.table("users").select(
        "email"
    ).eq("id", app["applicant_id"]).execute()
    applicant_email = applicant_result.data[0]["email"] if applicant_result.data else None

    case_result = supabase.table("cases").insert({
        "dispute_type": app["dispute_type"],
        "brief_description": app["brief_description"],
        "status": "BOTH_INVITED",
        "created_by": mediator_id,
        "assigned_mediator": mediator_id,
        "requesting_party_email": applicant_email,
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

    supabase.table("application_requests").update({
        "status": "ACCEPTED",
        "updated_at": now,
    }).eq("id", application_id).execute()

    def make_token(role: str, email: Optional[str]):
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        expires_at = (
            datetime.now(timezone.utc) + timedelta(hours=72)
        ).isoformat()

        insert_result = supabase.table("case_invitations").insert({
            "case_id": case_id,
            "invited_email": email or "",
            "token_hash": token_hash,
            "invitation_role": role,
            "expires_at": expires_at,
            "created_by": mediator_id,
            "invitation_attempt_count": 0,
        }).execute()

        invitation_id = insert_result.data[0]["id"] if insert_result.data else None

        return {"token": raw, "expires_at": expires_at, "invitation_id": invitation_id}

    requesting_party_invite = make_token("requesting_party", None)
    against_party_invite = make_token("against_party", app.get("against_party_email"))

    # FIX (related to #20): auto-link the applicant to their own
    # requesting_party invitation — they never need to click this link.
    requesting_party_invitation_id = requesting_party_invite.get("invitation_id")
    if requesting_party_invitation_id:
        supabase.table("case_invitations").update({
            "accepted_at": now,
            "accepted_by": app["applicant_id"],
        }).eq("id", requesting_party_invitation_id).execute()

    _write_audit_log_safe({
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
    })

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
# FIX #13: single consolidated endpoint, mandatory reason, always audits.
# case_id now uses application_id so it shows up in GET /audit-log.

class RejectApplicationRequest(BaseModel):
    rejection_reason: str


@router.patch("/{application_id}/reject")
async def reject_application(
    application_id: str,
    request: RejectApplicationRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Path 1: Mediator rejects application with mandatory reason.
    Party sees reason on their dashboard.
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
                "message": f"Application is not PENDING. Current: {app['status']}"
            }
        )

    now = datetime.utcnow().isoformat()

    supabase.table("application_requests").update({
        "status": "APPLICATION_REJECTED",
        "rejection_reason": request.rejection_reason,
        "updated_at": now,
    }).eq("id", application_id).execute()

    # FIX #13: was "case_id": None — now uses application_id so this
    # event is actually retrievable via GET /cases/{application_id}/audit-log
    _write_audit_log_safe({
        "case_id": None,
        "application_id": application_id,   # FIX #13 v2
        "actor_id": mediator_id,
        "action": "APPLICATION_REJECTED",
        "old_state": "APPLICATION_PENDING",
        "new_state": "APPLICATION_REJECTED",
        "metadata": {
            "application_id": application_id,
            "rejection_reason": request.rejection_reason
        },
        "created_at": now
    })

    return {
        "status": "APPLICATION_REJECTED",
        "application_id": application_id,
        "rejection_reason": request.rejection_reason,
        "message": "Application has been rejected."
    }


# ── PATCH /cases/{application_id}/withdraw ────────────────────────────────────

@router.patch("/{application_id}/withdraw")
async def withdraw_application(
    application_id: str,
    current_user: dict = Depends(require_role(["party_user"]))
):
    """
    Path 1: Party withdraws their application before mediator acts.
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

    # FIX #13: was "case_id": None — now uses application_id
    _write_audit_log_safe({
        "case_id": None,
        "application_id": application_id,   # FIX #13 v2
        "actor_id": user_id,
        "action": "APPLICATION_WITHDRAWN",
        "old_state": "APPLICATION_PENDING",
        "new_state": "WITHDRAWN",
        "metadata": {"application_id": application_id},
        "created_at": now
    })

    return {
        "status": "WITHDRAWN",
        "message": "Application withdrawn successfully."
    }


# ── GET /cases/applications/pending ───────────────────────────────────────────

@router.get("/applications/pending")
async def list_pending_applications(
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Mediator: sees all pending application requests assigned to them.
    FIX #18: each application is enriched with the applicant's email
    via a lookup to the users table.
    """
    mediator_id = current_user["user_id"]

    result = supabase.table("application_requests").select(
        "*"
    ).eq("assigned_mediator", mediator_id).eq(
        "status", "APPLICATION_PENDING"
    ).order("created_at", desc=True).execute()

    applications = result.data or []

    for app in applications:
        applicant_id = app.get("applicant_id")
        if applicant_id:
            user_result = supabase.table("users").select(
                "email"
            ).eq("id", applicant_id).execute()
            app["applicant_email"] = user_result.data[0]["email"] if user_result.data else None
        else:
            app["applicant_email"] = None

    return {
        "applications": applications,
        "total": len(applications)
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

# ── GET /cases/applications/{application_id}/audit-log ───────────────────────
# FIX #13: application-stage events (filed/rejected/withdrawn) are stored
# with case_id=None and application_id=<the real id>, since audit_logs.case_id
# has a foreign key constraint to the cases table and applications aren't
# cases yet. This endpoint queries by application_id instead.

@router.get("/applications/{application_id}/audit-log")
async def get_application_audit_log(
    application_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Returns audit log entries for an application request (pre-acceptance).
    Once an application is accepted and becomes a real case, use
    GET /cases/{case_id}/audit-log (in proposals.py) instead.
    """
    app_result = supabase.table("application_requests").select(
        "assigned_mediator"
    ).eq("id", application_id).execute()

    if not app_result.data:
        raise HTTPException(status_code=404, detail={
            "error": True, "code": "APPLICATION_NOT_FOUND"
        })

    if app_result.data[0]["assigned_mediator"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail={
            "error": True, "code": "FORBIDDEN"
        })

    result = supabase.table("audit_logs").select(
        "action, old_state, new_state, actor_id, metadata, created_at"
    ).eq("application_id", application_id).order(
        "created_at", desc=True
    ).execute()

    return result.data or []