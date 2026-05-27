# app/core/state_machine.py
# Full implementation: Week 2
# Updated: Day 1 - correct states aligned with roadmap

from enum import Enum
from datetime import datetime
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class CaseState(str, Enum):
    INVITED = "INVITED"
    PARTY_A_SUBMITTED = "PARTY_A_SUBMITTED"
    BOTH_SUBMITTED = "BOTH_SUBMITTED"
    BURST_1_PROCESSING = "BURST_1_PROCESSING"
    BURST_1_COMPLETE = "BURST_1_COMPLETE"
    QUESTIONNAIRE_ACTIVE = "QUESTIONNAIRE_ACTIVE"
    QUESTIONNAIRE_COMPLETE = "QUESTIONNAIRE_COMPLETE"
    BURST_2_PROCESSING = "BURST_2_PROCESSING"
    BURST_2_COMPLETE = "BURST_2_COMPLETE"
    PROPOSAL_PUBLISHED = "PROPOSAL_PUBLISHED"
    PROPOSAL_UNDER_REVIEW = "PROPOSAL_UNDER_REVIEW"
    MEDIATION_IN_PROGRESS = "MEDIATION_IN_PROGRESS"
    CLOSED = "CLOSED"
    PROCESSING_FAILED = "PROCESSING_FAILED"

# Valid transitions: (from_state, to_state)
VALID_TRANSITIONS = {
    (CaseState.INVITED, CaseState.PARTY_A_SUBMITTED),
    (CaseState.INVITED, CaseState.BOTH_SUBMITTED),
    (CaseState.PARTY_A_SUBMITTED, CaseState.BOTH_SUBMITTED),
    (CaseState.BOTH_SUBMITTED, CaseState.BURST_1_PROCESSING),
    (CaseState.BURST_1_PROCESSING, CaseState.BURST_1_COMPLETE),
    (CaseState.BURST_1_PROCESSING, CaseState.PROCESSING_FAILED),
    (CaseState.BURST_1_COMPLETE, CaseState.QUESTIONNAIRE_ACTIVE),
    (CaseState.QUESTIONNAIRE_ACTIVE, CaseState.QUESTIONNAIRE_COMPLETE),
    (CaseState.QUESTIONNAIRE_COMPLETE, CaseState.BURST_2_PROCESSING),
    (CaseState.BURST_2_PROCESSING, CaseState.BURST_2_COMPLETE),
    (CaseState.BURST_2_PROCESSING, CaseState.PROCESSING_FAILED),
    (CaseState.BURST_2_COMPLETE, CaseState.PROPOSAL_PUBLISHED),
    (CaseState.PROPOSAL_PUBLISHED, CaseState.PROPOSAL_UNDER_REVIEW),
    (CaseState.PROPOSAL_UNDER_REVIEW, CaseState.MEDIATION_IN_PROGRESS),
    (CaseState.PROPOSAL_UNDER_REVIEW, CaseState.CLOSED),
    (CaseState.MEDIATION_IN_PROGRESS, CaseState.PROPOSAL_PUBLISHED),
    (CaseState.PROCESSING_FAILED, CaseState.BURST_1_PROCESSING),
    (CaseState.PROCESSING_FAILED, CaseState.BURST_2_PROCESSING),
}

def transition(case_id: str, new_state: CaseState, actor_id: str = "system") -> dict:
    """
    THE ONLY function allowed to change case status.
    No route handler ever sets case.status directly.
    All status changes go through this function.

    Returns: dict with old_state, new_state, transitioned_at
    Raises: HTTPException 409 if transition is invalid
            HTTPException 404 if case not found
    """
    from app.core.database import supabase

    # Step 1: Get current state from DB
    try:
        result = supabase.table("cases").select(
            "status, negotiation_round"
        ).eq("id", case_id).single().execute()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    current_state_str = result.data["status"]

    # Step 2: Convert string to enum
    try:
        current_state = CaseState(current_state_str)
    except ValueError:
        logger.error(f"Case {case_id} has unknown state: {current_state_str}")
        raise HTTPException(
            status_code=500,
            detail="Case has invalid state in database"
        )

    # Step 3: Validate the transition
    if (current_state, new_state) not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_TRANSITION",
                "message": f"Cannot transition from {current_state.value} to {new_state.value}"
            }
        )

    # Step 4: Update case status in DB
    now = datetime.utcnow().isoformat()
    supabase.table("cases").update({
        "status": new_state.value,
        "updated_at": now
    }).eq("id", case_id).execute()

    # Step 5: Write audit log immediately after
    supabase.table("audit_logs").insert({
        "case_id": case_id,
        "actor_id": actor_id,
        "action": "STATE_TRANSITION",
        "old_state": current_state.value,
        "new_state": new_state.value,
        "created_at": now
    }).execute()

    logger.info(
        f"Case {case_id}: {current_state.value} -> {new_state.value} by {actor_id}"
    )

    return {
        "old_state": current_state.value,
        "new_state": new_state.value,
        "transitioned_at": now
    }