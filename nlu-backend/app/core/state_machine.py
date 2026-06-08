# app/core/state_machine.py
# Updated: Week 3 Day 1 - aligned with Version 5.0 final flow
# IMPORTANT: This is the ONLY place case status is changed.
# No route handler ever sets case.status directly.

from enum import Enum
from datetime import datetime
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


class CaseState(str, Enum):
    # ── Application request states (Path 1 only) ──────────────────────────────
    # These live on the application_requests table, NOT the cases table.
    # Listed here so state_machine can be imported as a single source of truth.
    APPLICATION_PENDING = "APPLICATION_PENDING"
    APPLICATION_REJECTED = "APPLICATION_REJECTED"
    WITHDRAWN = "WITHDRAWN"

    # ── Case states (both paths unified from BOTH_INVITED onwards) ─────────────
    BOTH_INVITED = "BOTH_INVITED"                     # replaces old INVITED
    FIRST_PARTY_SUBMITTED = "FIRST_PARTY_SUBMITTED"   # replaces old PARTY_A_SUBMITTED
    BOTH_SUBMITTED = "BOTH_SUBMITTED"
    BURST_1_PROCESSING = "BURST_1_PROCESSING"
    BURST_1_COMPLETE = "BURST_1_COMPLETE"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    QUESTIONNAIRE_ACTIVE = "QUESTIONNAIRE_ACTIVE"
    QUESTIONNAIRE_COMPLETE = "QUESTIONNAIRE_COMPLETE"
    BURST_2_PROCESSING = "BURST_2_PROCESSING"
    BURST_2_COMPLETE = "BURST_2_COMPLETE"
    PROPOSAL_DRAFT = "PROPOSAL_DRAFT"                 # replaces old PROPOSAL_UNDER_REVIEW
    PROPOSAL_PUBLISHED = "PROPOSAL_PUBLISHED"
    MEDIATION_IN_PROGRESS = "MEDIATION_IN_PROGRESS"
    MEDIATION_COMPLETE = "MEDIATION_COMPLETE"         # replaces old CLOSED
    MEDIATION_FAILED = "MEDIATION_FAILED"


# ── Valid case state transitions ───────────────────────────────────────────────
# Format: (from_state, to_state)
# Only these transitions are allowed. Everything else returns 409.
VALID_TRANSITIONS = {
    # Submission flow
    (CaseState.BOTH_INVITED,            CaseState.FIRST_PARTY_SUBMITTED),
    (CaseState.BOTH_INVITED,            CaseState.BOTH_SUBMITTED),        
    (CaseState.FIRST_PARTY_SUBMITTED,   CaseState.BOTH_SUBMITTED),

    # Burst 1 pipeline
    (CaseState.BOTH_SUBMITTED,          CaseState.BURST_1_PROCESSING),
    (CaseState.BURST_1_PROCESSING,      CaseState.BURST_1_COMPLETE),
    (CaseState.BURST_1_PROCESSING,      CaseState.PROCESSING_FAILED),

    # Questionnaire
    (CaseState.BURST_1_COMPLETE,        CaseState.QUESTIONNAIRE_ACTIVE),
    (CaseState.QUESTIONNAIRE_ACTIVE,    CaseState.QUESTIONNAIRE_COMPLETE),

    # Burst 2 pipeline
    (CaseState.QUESTIONNAIRE_COMPLETE,  CaseState.BURST_2_PROCESSING),
    (CaseState.BURST_2_PROCESSING,      CaseState.BURST_2_COMPLETE),
    (CaseState.BURST_2_PROCESSING,      CaseState.PROCESSING_FAILED),

    # Proposal flow
    (CaseState.BURST_2_COMPLETE,        CaseState.PROPOSAL_DRAFT),
    (CaseState.PROPOSAL_DRAFT,          CaseState.PROPOSAL_PUBLISHED),
    (CaseState.PROPOSAL_PUBLISHED,      CaseState.MEDIATION_IN_PROGRESS),

    # Negotiation loop - rejection sends back to PROPOSAL_DRAFT for new round
    (CaseState.MEDIATION_IN_PROGRESS,   CaseState.PROPOSAL_DRAFT),

    # Resolution paths
    (CaseState.MEDIATION_IN_PROGRESS,   CaseState.MEDIATION_COMPLETE),
    (CaseState.MEDIATION_IN_PROGRESS,   CaseState.MEDIATION_FAILED),

    # Retry path - PROCESSING_FAILED can go back to either burst
    (CaseState.PROCESSING_FAILED,       CaseState.BURST_1_PROCESSING),
    (CaseState.PROCESSING_FAILED,       CaseState.BURST_2_PROCESSING),
}


def transition(case_id: str, new_state: CaseState, actor_id: str = "system") -> dict:
    """
    THE ONLY function allowed to change case status.
    No route handler ever sets case.status directly.
    All status changes must go through this function.

    Args:
        case_id:   UUID of the case to transition
        new_state: The target CaseState enum value
        actor_id:  user_id of who triggered this (defaults to "system" for Celery tasks)

    Returns:
        dict with old_state, new_state, transitioned_at

    Raises:
        HTTPException 404 if case not found
        HTTPException 409 if transition is not valid
        HTTPException 500 if case has an unrecognised state in DB
    """
    from app.core.database import supabase

    # ── Step 1: Get current state from DB ─────────────────────────────────────
    try:
        result = supabase.table("cases").select(
            "status, negotiation_round"
        ).eq("id", case_id).single().execute()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "code": "CASE_NOT_FOUND",
                "message": f"Case {case_id} not found"
            }
        )

    current_state_str = result.data["status"]

    # ── Step 2: Convert DB string to enum ─────────────────────────────────────
    try:
        current_state = CaseState(current_state_str)
    except ValueError:
        logger.error(f"Case {case_id} has unrecognised state in DB: {current_state_str}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "code": "INVALID_STATE_IN_DB",
                "message": f"Case has unrecognised state: {current_state_str}"
            }
        )

    # ── Step 3: Validate the transition ───────────────────────────────────────
    if (current_state, new_state) not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_TRANSITION",
                "message": f"Cannot transition from {current_state.value} to {new_state.value}"
            }
        )

    # ── Step 4: Update case status in DB ──────────────────────────────────────
    now = datetime.utcnow().isoformat()

    supabase.table("cases").update({
        "status": new_state.value,
        "updated_at": now
    }).eq("id", case_id).execute()

    # ── Step 5: Write to audit_log in the same logical operation ──────────────
    # audit_logs is INSERT-only - no UPDATE or DELETE ever
    supabase.table("audit_logs").insert({
        "case_id": case_id,
        "actor_id": actor_id,
        "action": "STATE_TRANSITION",
        "old_state": current_state.value,
        "new_state": new_state.value,
        "metadata": {
            "triggered_by": actor_id
        },
        "created_at": now
    }).execute()

    logger.info(
        f"Case {case_id}: {current_state.value} -> {new_state.value} "
        f"(triggered by {actor_id})"
    )

    return {
        "old_state": current_state.value,
        "new_state": new_state.value,
        "transitioned_at": now
    }


def get_current_state(case_id: str) -> CaseState:
    """
    Helper to read the current state of a case without transitioning.
    Use this when you need to check state before deciding what to do.
    """
    from app.core.database import supabase

    try:
        result = supabase.table("cases").select(
            "status"
        ).eq("id", case_id).single().execute()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "code": "CASE_NOT_FOUND",
                "message": f"Case {case_id} not found"
            }
        )

    try:
        return CaseState(result.data["status"])
    except ValueError:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "code": "INVALID_STATE_IN_DB",
                "message": f"Unrecognised state: {result.data['status']}"
            }
        )