# app/core/state_machine.py
# Updated: Week 4 - added PROPOSAL_PUBLISHED -> MEDIATION_COMPLETE transition
#                   and MEDIATION_COMPLETE -> MEDIATION_COMPLETE (mediator finalise no-op)
#
# GOLDEN RULE: This is the ONLY place case status is ever changed.
# No route handler, no Celery task, no helper function sets case.status directly.
# Every status change goes through transition(). No exceptions.

from enum import Enum
from datetime import datetime
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


class CaseState(str, Enum):
    """
    WHY str, Enum and not just Enum?
    ─────────────────────────────────
    Supabase stores status as a plain TEXT column. When you read a row,
    you get back a Python string like "BOTH_INVITED". If CaseState were
    a plain Enum, then CaseState("BOTH_INVITED") == "BOTH_INVITED" would
    be False — one is an enum object, the other is a string.

    With `str, Enum`, each member IS a string. So:
        CaseState.BOTH_INVITED == "BOTH_INVITED"  →  True
        CaseState("BOTH_INVITED")                 →  CaseState.BOTH_INVITED

    This means:
    - You can store   new_state.value  OR  new_state  in Supabase (both work)
    - You can compare case["status"] == CaseState.BOTH_INVITED directly
    - FastAPI automatically validates route params typed as CaseState
    """

    # ── Application request states (Path 1 only) ──────────────────────────────
    # IMPORTANT: These live on the application_requests table, NOT the cases table.
    # They are listed here so state_machine.py is the single source of truth
    # for ALL state strings used anywhere in the backend.
    APPLICATION_PENDING  = "APPLICATION_PENDING"
    APPLICATION_REJECTED = "APPLICATION_REJECTED"
    WITHDRAWN            = "WITHDRAWN"

    # ── Case states (both paths unified from BOTH_INVITED onwards) ─────────────
    # Once a formal case exists, it always starts at BOTH_INVITED.
    # Path 1 (party-initiated) and Path 2 (mediator-initiated) are identical
    # from this point forward.
    BOTH_INVITED           = "BOTH_INVITED"
    FIRST_PARTY_SUBMITTED  = "FIRST_PARTY_SUBMITTED"
    BOTH_SUBMITTED         = "BOTH_SUBMITTED"
    BURST_1_PROCESSING     = "BURST_1_PROCESSING"
    BURST_1_COMPLETE       = "BURST_1_COMPLETE"
    PROCESSING_FAILED      = "PROCESSING_FAILED"
    QUESTIONNAIRE_ACTIVE   = "QUESTIONNAIRE_ACTIVE"
    QUESTIONNAIRE_COMPLETE = "QUESTIONNAIRE_COMPLETE"
    BURST_2_PROCESSING     = "BURST_2_PROCESSING"
    BURST_2_COMPLETE       = "BURST_2_COMPLETE"
    PROPOSAL_DRAFT         = "PROPOSAL_DRAFT"
    PROPOSAL_PUBLISHED     = "PROPOSAL_PUBLISHED"
    MEDIATION_IN_PROGRESS  = "MEDIATION_IN_PROGRESS"
    MEDIATION_COMPLETE     = "MEDIATION_COMPLETE"
    MEDIATION_FAILED       = "MEDIATION_FAILED"


# ── Valid state transitions ────────────────────────────────────────────────────
#
# HOW TO READ THIS:
#   (CaseState.FROM_STATE, CaseState.TO_STATE)
#
# If a transition is NOT in this set, transition() raises HTTP 409 Conflict.
# This is intentional. It prevents the frontend or a buggy Celery task from
# moving a case into an invalid state (e.g. jumping from BOTH_INVITED to
# MEDIATION_COMPLETE, skipping the entire AI pipeline).
#
# Every time you add a new flow, add the transition here first. If the code
# calls transition() and it 409s, the answer is always: add the pair here,
# not bypass the check.

VALID_TRANSITIONS: set[tuple[CaseState, CaseState]] = {

    # ── Submission flow ────────────────────────────────────────────────────────
    # Either party can be first. If both submit simultaneously (rare),
    # we go directly to BOTH_SUBMITTED.
    (CaseState.BOTH_INVITED,           CaseState.FIRST_PARTY_SUBMITTED),
    (CaseState.BOTH_INVITED,           CaseState.BOTH_SUBMITTED),       # edge case: simultaneous
    (CaseState.FIRST_PARTY_SUBMITTED,  CaseState.BOTH_SUBMITTED),

    # ── AI Burst 1 pipeline ────────────────────────────────────────────────────
    # Triggered automatically by Celery when BOTH_SUBMITTED fires.
    # PROCESSING_FAILED is reachable from any PROCESSING state (see retry below).
    (CaseState.BOTH_SUBMITTED,         CaseState.BURST_1_PROCESSING),
    (CaseState.BURST_1_PROCESSING,     CaseState.BURST_1_COMPLETE),
    (CaseState.BURST_1_PROCESSING,     CaseState.PROCESSING_FAILED),

    # ── Questionnaire ──────────────────────────────────────────────────────────
    # Mediator manually sends questionnaire after reviewing Burst 1.
    # QUESTIONNAIRE_COMPLETE fires when the SECOND party submits answers.
    (CaseState.BURST_1_COMPLETE,       CaseState.QUESTIONNAIRE_ACTIVE),
    (CaseState.QUESTIONNAIRE_ACTIVE,   CaseState.QUESTIONNAIRE_COMPLETE),

    # ── AI Burst 2 pipeline ────────────────────────────────────────────────────
    # Triggered automatically when QUESTIONNAIRE_COMPLETE fires.
    (CaseState.QUESTIONNAIRE_COMPLETE, CaseState.BURST_2_PROCESSING),
    (CaseState.BURST_2_PROCESSING,     CaseState.BURST_2_COMPLETE),
    (CaseState.BURST_2_PROCESSING,     CaseState.PROCESSING_FAILED),

    # ── Proposal flow ──────────────────────────────────────────────────────────
    # Mediator creates draft → publishes it → parties respond.
    (CaseState.BURST_2_COMPLETE,       CaseState.PROPOSAL_DRAFT),
    (CaseState.PROPOSAL_DRAFT,         CaseState.PROPOSAL_PUBLISHED),

    # ── Week 4 addition: both parties accept the FIRST published proposal ──────
    #
    # BUG THAT WAS MISSING: The original Week 3 file had no transition from
    # PROPOSAL_PUBLISHED directly to MEDIATION_COMPLETE.
    #
    # What this means in practice:
    #   When both parties accept the proposal, the respond endpoint calls
    #   transition(case_id, CaseState.MEDIATION_COMPLETE).
    #   Without this line, that call raises HTTP 409 Conflict with:
    #       "Cannot transition from PROPOSAL_PUBLISHED to MEDIATION_COMPLETE"
    #   The case gets permanently stuck in PROPOSAL_PUBLISHED even though
    #   both parties accepted. The settlement PDF never generates.
    #   The mediator sees both parties accepted but the status never changes.
    #
    # WHY this is separate from the MEDIATION_IN_PROGRESS path:
    #   PROPOSAL_PUBLISHED → MEDIATION_IN_PROGRESS  happens when ANY party rejects.
    #   PROPOSAL_PUBLISHED → MEDIATION_COMPLETE      happens when BOTH parties accept.
    #   These are two different outcomes of the SAME state. Both must exist.
    (CaseState.PROPOSAL_PUBLISHED,     CaseState.MEDIATION_COMPLETE),

    # Any rejection sends the case into MEDIATION_IN_PROGRESS (negotiation loop).
    (CaseState.PROPOSAL_PUBLISHED,     CaseState.MEDIATION_IN_PROGRESS),

    # ── Negotiation loop ───────────────────────────────────────────────────────
    # After rejection, mediator edits and publishes a new proposal.
    # The case goes back to PROPOSAL_DRAFT for the new round.
    # Round counter is tracked separately on the cases.negotiation_round column.
    (CaseState.MEDIATION_IN_PROGRESS,  CaseState.PROPOSAL_DRAFT),

    # Both parties accept a revised proposal (round 2 or 3).
    # This is reached from MEDIATION_IN_PROGRESS, not PROPOSAL_PUBLISHED,
    # because after a rejection the flow is:
    #   PROPOSAL_PUBLISHED → MEDIATION_IN_PROGRESS → PROPOSAL_DRAFT
    #   → PROPOSAL_PUBLISHED → MEDIATION_IN_PROGRESS → MEDIATION_COMPLETE
    (CaseState.MEDIATION_IN_PROGRESS,  CaseState.MEDIATION_COMPLETE),

    # Failure path: after max rounds exhausted with no agreement.
    (CaseState.MEDIATION_IN_PROGRESS,  CaseState.MEDIATION_FAILED),

    # ── Mediator finalise (no-op transition) ───────────────────────────────────
    #
    # WHY does MEDIATION_COMPLETE → MEDIATION_COMPLETE exist?
    #
    # When the mediator clicks [Finalise Case], the backend endpoint calls
    # transition(case_id, CaseState.MEDIATION_COMPLETE).
    # At that point the case is ALREADY in MEDIATION_COMPLETE (it got there
    # when both parties accepted the proposal).
    #
    # Without this self-transition, the finalise endpoint would 409 because
    # "MEDIATION_COMPLETE → MEDIATION_COMPLETE" is not in the valid set.
    # The mediator cannot finalise, parties never see the settlement screen,
    # and the PDF never generates.
    #
    # This is intentional design: finalise is a mediator acknowledgement step,
    # not a state change. The audit log records it, but the status doesn't move.
    (CaseState.MEDIATION_COMPLETE,     CaseState.MEDIATION_COMPLETE),

    # ── Retry paths ────────────────────────────────────────────────────────────
    # When a pipeline fails, the mediator can retry from the beginning.
    # Both bursts share PROCESSING_FAILED as their failure state.
    (CaseState.PROCESSING_FAILED,      CaseState.BURST_1_PROCESSING),
    (CaseState.PROCESSING_FAILED,      CaseState.BURST_2_PROCESSING),
}


def transition(
    case_id:  str,
    new_state: CaseState,
    actor_id:  str = "system",
    metadata:  dict | None = None,
) -> dict:
    """
    THE ONLY function allowed to change case status.

    HOW IT WORKS — step by step:
    ─────────────────────────────
    1. Read the current status from the DB.
    2. Convert the DB string to a CaseState enum member.
    3. Check if (current_state, new_state) is in VALID_TRANSITIONS.
       If not → HTTP 409. Do not touch the DB.
    4. UPDATE cases.status to new_state.
    5. INSERT a row into audit_logs in the same logical operation.
       audit_logs is INSERT-only — no UPDATE, no DELETE, ever.

    WHY we do not use a DB transaction for steps 4+5:
    ─────────────────────────────────────────────────
    supabase-py uses the REST API, not a raw psycopg2 connection,
    so we cannot wrap both calls in BEGIN/COMMIT. In practice this is
    acceptable for MVP because:
    - Both calls are fast (< 50ms each)
    - If the audit log insert fails, the status is already updated and
      the case is not broken — just the audit entry is missing.
    - For production, this would use a Postgres function (RPC) that does
      both in a single transaction. That is a Version 2 improvement.

    Args:
        case_id:   UUID string of the case to transition.
        new_state: Target CaseState enum value.
        actor_id:  user_id of who triggered this.
                   Use the current_user["id"] from your JWT dependency.
                   Celery tasks pass "system" (the default).
        metadata:  Optional extra data to store in the audit log.
                   Use this to record things like rejection reasons,
                   retry counts, or round numbers.

    Returns:
        dict: { old_state, new_state, transitioned_at }

    Raises:
        HTTPException 404: case not found in DB.
        HTTPException 409: transition not in VALID_TRANSITIONS.
        HTTPException 500: the DB has a status string we do not recognise
                           (means someone wrote to cases.status directly —
                           this should never happen if the golden rule is followed).
    """
    from app.core.database import supabase

    # ── Step 1: Read current state ─────────────────────────────────────────────
    # We fetch negotiation_round too so audit metadata is richer.
    # .single() raises an exception (not returns None) if 0 or 2+ rows match.
    # We catch that and convert it to a clean 404.
    try:
        result = supabase.table("cases").select(
            "status, negotiation_round"
        ).eq("id", case_id).single().execute()
    except Exception as exc:
        logger.warning(f"transition(): case {case_id} not found. Error: {exc}")
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "code": "CASE_NOT_FOUND",
                "message": f"Case {case_id} not found",
            },
        )

    current_state_str = result.data["status"]
    negotiation_round = result.data.get("negotiation_round", 0)

    # ── Step 2: Convert DB string → enum ──────────────────────────────────────
    # If this raises ValueError, someone wrote to cases.status directly,
    # bypassing this function. That is a bug in the calling code.
    try:
        current_state = CaseState(current_state_str)
    except ValueError:
        logger.error(
            f"transition(): case {case_id} has unrecognised status in DB: "
            f"'{current_state_str}'. Someone wrote status directly — fix that code."
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "code": "INVALID_STATE_IN_DB",
                "message": (
                    f"Case has unrecognised state '{current_state_str}'. "
                    "Status was written directly to DB, bypassing state machine."
                ),
            },
        )

    # ── Step 3: Validate the transition ───────────────────────────────────────
    # If this 409s and you think it should not, check VALID_TRANSITIONS above.
    # The fix is always to add the pair there — NOT to bypass this check.
    if (current_state, new_state) not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "INVALID_TRANSITION",
                "message": (
                    f"Cannot transition from '{current_state.value}' "
                    f"to '{new_state.value}'"
                ),
                "allowed_from_current": [
                    to.value
                    for (frm, to) in VALID_TRANSITIONS
                    if frm == current_state
                ],
            },
        )

    # ── Step 4: Update case status ────────────────────────────────────────────
    now = datetime.utcnow().isoformat()

    supabase.table("cases").update({
        "status":     new_state.value,
        "updated_at": now,
    }).eq("id", case_id).execute()

    # ── Step 5: Write audit log ────────────────────────────────────────────────
    # audit_logs is INSERT-only. The RLS policy permits no UPDATE or DELETE.
    # Every state change MUST have a corresponding audit entry.
    # metadata is a JSONB column — pass any dict you want.
    audit_metadata = {
        "triggered_by":     actor_id,
        "negotiation_round": negotiation_round,
        **(metadata or {}),
    }

    supabase.table("audit_logs").insert({
        "case_id":    case_id,
        "actor_id":   actor_id,
        "action":     "STATE_TRANSITION",
        "old_state":  current_state.value,
        "new_state":  new_state.value,
        "metadata":   audit_metadata,
        "created_at": now,
    }).execute()

    logger.info(
        f"[state_machine] {case_id}: {current_state.value} → {new_state.value} "
        f"(actor={actor_id})"
    )

    return {
        "old_state":        current_state.value,
        "new_state":        new_state.value,
        "transitioned_at":  now,
    }


def get_current_state(case_id: str) -> CaseState:
    """
    Read the current state of a case without transitioning.

    Use this when you need to CHECK state before deciding what to do,
    without triggering a change. Example:

        state = get_current_state(case_id)
        if state != CaseState.BURST_1_COMPLETE:
            raise HTTPException(400, "Cannot send questionnaire yet")
        transition(case_id, CaseState.QUESTIONNAIRE_ACTIVE, actor_id=user_id)

    WHY not just read cases.status directly in the route?
    Because if you inline the DB call everywhere, you scatter the
    "what if status is unrecognised" error handling across every route.
    This function centralises that logic.
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
                "message": f"Case {case_id} not found",
            },
        )

    try:
        return CaseState(result.data["status"])
    except ValueError:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "code": "INVALID_STATE_IN_DB",
                "message": f"Unrecognised state: {result.data['status']}",
            },
        )


def get_allowed_transitions(case_id: str) -> list[str]:
    """
    Returns a list of states this case CAN move to from its current state.

    Useful for debugging and for the mediator dashboard to know
    what actions are available. Example response:
        ["MEDIATION_COMPLETE", "MEDIATION_IN_PROGRESS"]

    This is also used by the 409 error response in transition() to tell
    the caller what WOULD have been valid.
    """
    current = get_current_state(case_id)
    return [
        to.value
        for (frm, to) in VALID_TRANSITIONS
        if frm == current
    ]