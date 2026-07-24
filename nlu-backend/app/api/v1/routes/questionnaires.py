# app/api/v1/routes/questionnaires.py
# Week 4 — Questionnaire generation, distribution, and response collection
#
# FLOW THIS FILE HANDLES:
#   1. Mediator clicks [Send Questionnaire]
#      → POST /cases/{id}/questionnaires
#      → Calls Sub-system C to generate questions
#      → Saves to questionnaires table
#      → Transitions case to QUESTIONNAIRE_ACTIVE
#
#   2. Party opens their questionnaire
#      → GET /cases/{id}/questionnaires/{q_id}
#      → Returns only questions directed at THEIR role
#      → 'purpose' field stripped — parties never see why a question was asked
#
#   3. Party submits answers
#      → POST /cases/{id}/questionnaires/{q_id}/responses
#      → Saves to questionnaire_responses table
#      → If BOTH parties have now answered:
#          transitions to QUESTIONNAIRE_COMPLETE
#          fires process_burst_2.delay(case_id)  ← this is what Niharika waits for
#
#   4. Mediator views both parties' answers side by side
#      → GET /cases/{id}/questionnaires/{q_id}/responses
#      → Returns all responses (mediator only)

import logging
import sys
import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Any

from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.core.state_machine import transition, CaseState, get_current_state

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Questionnaires"])


# ── Request / Response models ──────────────────────────────────────────────────

class QuestionnaireResponseSubmit(BaseModel):
    """
    Body for POST /questionnaires/{q_id}/responses
    answers is a dict: { "question_id": "answer_text" }

    Example:
    {
        "answers": {
            "q1": "yes",
            "q2": "The landlord refused to return my deposit",
            "q3": "7"
        }
    }
    """
    answers: dict[str, Any]


# ── Helper: get party's role in a specific case ────────────────────────────────

def _get_party_role_in_case(case_id: str, user_id: str) -> str:
    """
    Returns "requesting_party" or "against_party" for a given user on a given case.
    Raises 403 if the user is not a party on this case.

    WHY we check case_invitations and not users.role:
        Both requesting party and against party have role = "party_user" in users table.
        Their SPECIFIC role (requesting vs against) is determined by which invitation
        they accepted. This is the Version 5.0 Party Context Model — one role in the
        users table, context determined per case via case_invitations.
    """
    inv_resp = supabase.table("case_invitations") \
        .select("invitation_role") \
        .eq("case_id", case_id) \
        .eq("accepted_by", user_id) \
        .single() \
        .execute()

    if not inv_resp.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": True,
                "code": "NOT_A_PARTY",
                "message": "You are not a party on this case",
            },
        )

    return inv_resp.data["invitation_role"]   # "requesting_party" or "against_party"


# ── Helper: verify mediator owns this case ────────────────────────────────────

def _verify_mediator_owns_case(case_id: str, mediator_id: str) -> dict:
    """
    Returns the case dict if this mediator is the assigned mediator.
    Raises 403 if they are not.
    Raises 404 if case doesn't exist.

    WHY 403 and not 404 for wrong mediator:
        The security rule for this platform is "always 403, never 404"
        for authenticated users accessing things they don't own.
        Returning 404 would reveal whether a case exists at all.
    """
    case_resp = supabase.table("cases") \
        .select("id, status, assigned_mediator") \
        .eq("id", case_id) \
        .single() \
        .execute()

    if not case_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "code": "CASE_NOT_FOUND", "message": "Case not found"},
        )

    if case_resp.data["assigned_mediator"] != mediator_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "code": "FORBIDDEN", "message": "You are not the mediator for this case"},
        )

    return case_resp.data


# ── ENDPOINT 1: Mediator sends questionnaire ──────────────────────────────────

@router.post(
    "/cases/{case_id}/questionnaires",
    status_code=status.HTTP_201_CREATED,
    summary="Mediator sends AI-generated questionnaire to both parties",
)
async def send_questionnaire(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    """
    WHAT THIS DOES:
    ──────────────
    1. Verifies mediator owns the case
    2. Checks case is in BURST_1_COMPLETE (cannot send questionnaire before AI analysis)
    3. Fetches conflict_extraction JSON from ai_analysis table (Burst 1 result)
    4. Calls Sub-system C to generate 8-12 targeted questions
    5. Saves questions to questionnaires table
    6. Transitions case to QUESTIONNAIRE_ACTIVE
    7. Writes audit log

    WHY we check BURST_1_COMPLETE:
        Sub-system C takes conflict_extraction as input. If Burst 1 hasn't run,
        there is no conflict_extraction to pass in. The questionnaire would be
        generic and useless. The state check enforces the correct sequence.

    WHY the mediator sends it manually (not automatic):
        The mediator may want to review the AI analysis before sending questions.
        They might flag AI claims, add notes, or decide the case needs more info.
        This is a deliberate human checkpoint per the V5.0 flow.
    """
    # Step 1: Verify mediator owns this case
    case = _verify_mediator_owns_case(case_id, current_user["user_id"])

    # Step 2: Case must be in BURST_1_COMPLETE to send questionnaire
    if case["status"] != CaseState.BURST_1_COMPLETE.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": True,
                "code": "INVALID_CASE_STATE",
                "message": f"Cannot send questionnaire. Case must be in BURST_1_COMPLETE. Currently: {case['status']}",
                "current_state": case["status"],
                "required_state": CaseState.BURST_1_COMPLETE.value,
            },
        )

    # Step 3: Fetch conflict_extraction from Burst 1 results
    analysis_resp = supabase.table("ai_analysis") \
        .select("conflict_extraction") \
        .eq("case_id", case_id) \
        .eq("burst_number", 1) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    analysis_data = analysis_resp.data[0] if analysis_resp.data else None
    if not analysis_data or not analysis_data.get("conflict_extraction"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": True,
                "code": "ANALYSIS_MISSING",
                "message": "Burst 1 analysis not found. Cannot generate questionnaire without conflict extraction.",
            },
        )

    conflict_extraction = analysis_data["conflict_extraction"]

    # Step 4: Call Sub-system C to generate questions
    # Sub-system C lives in the ai/ folder (Rishika's code)
    # We add the project root to path so we can import from ai/
    try:
        project_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../../../")
        )
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

        from ai.schemas import ConflictExtraction
        from ai.subsystems.subsystem_c import generate_questionnaire

        # Ensure it is a Pydantic model object, not a raw dictionary
        if isinstance(conflict_extraction, dict):
            conflict_extraction = ConflictExtraction(**conflict_extraction)

        questionnaire_output = generate_questionnaire(conflict_extraction)

        # Convert Pydantic model to dict if needed
        if hasattr(questionnaire_output, "dict"):
            questions_data = questionnaire_output.dict()
        elif hasattr(questionnaire_output, "model_dump"):
            questions_data = questionnaire_output.model_dump()
        else:
            questions_data = questionnaire_output

    except ImportError as e:
        logger.error(f"Could not import subsystem_c: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": True,
                "code": "AI_MODULE_UNAVAILABLE",
                "message": "Sub-system C (questionnaire generation) could not be loaded.",
            },
        )
    except Exception as e:
        logger.error(f"Sub-system C failed for case {case_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": True,
                "code": "QUESTIONNAIRE_GENERATION_FAILED",
                "message": f"AI questionnaire generation failed: {str(e)}",
            },
        )

    # Step 5: Save questionnaire to database
    q_insert = supabase.table("questionnaires").insert({
        "case_id":    case_id,
        "created_by": current_user["user_id"],
        "questions":  questions_data,
    }).execute()

    if not q_insert.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "code": "DB_INSERT_FAILED", "message": "Failed to save questionnaire"},
        )

    questionnaire_id = q_insert.data[0]["id"]

    # Step 6: Transition case to QUESTIONNAIRE_ACTIVE
    transition(
        case_id=case_id,
        new_state=CaseState.QUESTIONNAIRE_ACTIVE,
        actor_id=current_user["user_id"],
        metadata={"questionnaire_id": questionnaire_id},
    )

    logger.info(f"Questionnaire {questionnaire_id} sent for case {case_id} by mediator {current_user["user_id"]}")

    return {
        "questionnaire_id": questionnaire_id,
        "case_id": case_id,
        "status": "questionnaire_active",
        "message": "Questionnaire sent. Both parties have been notified.",
    }

    # ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1B: Party/Mediator discovers active questionnaire for a case
# This was a gap in the original design — the party dashboard needs to
# discover the q_id before it can call GET /questionnaires/{q_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/questionnaires",
    summary="Get the active questionnaire for a case. Returns active_questionnaire_id.",
)
async def list_questionnaires(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    WHY THIS ENDPOINT EXISTS:
    ─────────────────────────
    The party dashboard needs to know the q_id before it can fetch questions.
    Without this, the party has no way to discover which questionnaire to open.
    The mediator's POST /questionnaires returns the q_id, but the party never
    sees that response — they only see their dashboard status update.

    This endpoint bridges that gap.
    """

    # Verify the user belongs to this case
    if current_user["role"] == "party_user":
        _get_party_role_in_case(case_id, current_user["id"])  # raises 403 if not a party
    elif current_user["role"] == "mediator":
        _verify_mediator_owns_case(case_id, current_user["id"])  # raises 403 if not their case

    # Fetch the most recent questionnaire for this case
    # For MVP there is only ever one per case
    resp = supabase.table("questionnaires") \
        .select("id, case_id, created_at") \
        .eq("case_id", case_id) \
        .order("created_at", desc=True) \
        .execute()

    if not resp.data:
        return {
            "questionnaires": [],
            "active_questionnaire_id": None,
            "message": "No questionnaire has been sent yet for this case.",
        }

    latest = resp.data[0]

    return {
        "questionnaires": resp.data,
        "active_questionnaire_id": latest["id"],
        "created_at": latest["created_at"],
    }


@router.get(
    "/cases/{case_id}/questionnaires",
    summary="List all questionnaires for a case",
)
async def list_questionnaires(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a list of all questionnaires created for this case.
    Both mediators and parties can see this list, so they can fetch
    the questions directed at them.
    """
    resp = supabase.table("questionnaires") \
        .select("id, created_at, created_by") \
        .eq("case_id", case_id) \
        .order("created_at", desc=False) \
        .execute()
    
    return resp.data or []


# ── ENDPOINT 2: Party fetches their questions ─────────────────────────────────

@router.get(
    "/cases/{case_id}/questionnaires/{q_id}",
    summary="Party gets their filtered questions. Mediator gets all questions.",
)
async def get_questionnaire(
    case_id: str,
    q_id:    str,
    current_user: dict = Depends(get_current_user),
):
    """
    WHAT THIS DOES:
    ──────────────
    Mediator: returns ALL questions including the 'purpose' field
    Party:    returns ONLY questions directed at their role
              AND strips the 'purpose' field (parties must not see why they're asked)

    WHY 'purpose' is stripped for parties:
        Each question has a 'purpose' field that explains the mediator's intent,
        e.g. "Determine if party A has documentation to support their claim."
        If parties see this, they can game their answers to produce favorable
        AI analysis. The purpose is internal mediator context only.

    WHY questions are filtered by directed_at:
        Sub-system C generates questions with directed_at = "requesting_party",
        "against_party", or "both". A question about the tenancy agreement only
        makes sense for the requesting party. A question about the deposit only
        makes sense for the against party (landlord). Showing all questions to
        both parties would be confusing and could reveal the other party's angles.
    """
    # Fetch the questionnaire
    q_resp = supabase.table("questionnaires") \
        .select("*") \
        .eq("id", q_id) \
        .eq("case_id", case_id) \
        .single() \
        .execute()

    if not q_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "code": "QUESTIONNAIRE_NOT_FOUND", "message": "Questionnaire not found"},
        )

    questions_data = q_resp.data.get("questions", {})
    if isinstance(questions_data, list):
        all_questions = questions_data
    elif isinstance(questions_data, dict):
        all_questions = questions_data.get("questions", [])
    else:
        all_questions = []

    def map_question(q):
        mapped = {**q}
        # Map ID
        mapped["id"] = q.get("question_id") or q.get("id")
        # Map Text
        mapped["text"] = q.get("question_text") or q.get("text")
        # Map Type
        q_type = q.get("question_type") or q.get("type")
        if q_type == "open":
            q_type = "open_ended"
        mapped["type"] = q_type
        return mapped

    # Mediator sees everything — no filtering, no stripping
    if current_user["role"] == "mediator":
        mapped_questions = [map_question(q) for q in all_questions]
        return {
            "questionnaire_id": q_id,
            "case_id": case_id,
            "questions": mapped_questions,
            "total": len(mapped_questions),
        }

    # Party: determine their role in this case
    party_role = _get_party_role_in_case(case_id, current_user["user_id"])

    # Filter: only questions directed at this party's role or at "both"
    filtered_questions = []
    for q in all_questions:
        directed_at = q.get("directed_at", "both")
        # Normalize role values to be robust
        if directed_at == "party_a":
            directed_at = "requesting_party"
        elif directed_at == "party_b":
            directed_at = "against_party"

        if directed_at in [party_role, "both"]:
            # Strip 'purpose' field — parties never see why they're being asked
            safe_question = {k: v for k, v in q.items() if k != "purpose"}
            mapped_q = map_question(safe_question)
            filtered_questions.append(mapped_q)

    return {
        "questionnaire_id": q_id,
        "case_id": case_id,
        "your_role": party_role,
        "questions": filtered_questions,
        "total": len(filtered_questions),
    }


# ── ENDPOINT 3: Party submits answers ────────────────────────────────────────

@router.post(
    "/cases/{case_id}/questionnaires/{q_id}/responses",
    status_code=status.HTTP_201_CREATED,
    summary="Party submits questionnaire answers. Triggers Burst 2 when both parties answered.",
)
async def submit_questionnaire_response(
    case_id: str,
    q_id:    str,
    body:    QuestionnaireResponseSubmit,
    current_user: dict = Depends(require_role(["party_user"])),
):
    """
    WHAT THIS DOES:
    ──────────────
    1. Verifies party belongs to this case
    2. Checks they haven't already submitted (unique constraint: one response per party)
    3. Saves answers to questionnaire_responses table
    4. Writes audit log for this party answering
    5. Counts how many responses now exist for this questionnaire
    6. If count == 2 (both parties answered):
         - Transitions to QUESTIONNAIRE_COMPLETE
         - Fires process_burst_2.delay(case_id)  ← Niharika's Celery task

    THE CRITICAL LOGIC — why we count responses:
    ─────────────────────────────────────────────
    We cannot just check "did the other party answer" by name, because we don't
    know in advance which party will answer first. Instead we count rows in
    questionnaire_responses for this questionnaire_id. When count reaches 2,
    both parties have answered regardless of order.

    The UNIQUE constraint on (questionnaire_id, respondent_id) in the DB
    prevents a party from submitting twice. Even if the frontend calls this
    endpoint twice (e.g. double-click), the second DB insert will fail before
    we reach the count check.

    WHY we use >= 2 and not == 2:
    ──────────────────────────────
    In theory with the UNIQUE constraint, count can never exceed 2. But defensive
    coding means we treat "2 or more" as "both answered" rather than "exactly 2",
    because if a constraint is ever relaxed in future, we still do the right thing.
    """
    # Step 1: Verify party belongs to this case and get their role
    party_role = _get_party_role_in_case(case_id, current_user["user_id"])

    # Step 2: Check for duplicate submission BEFORE touching the DB
    existing_resp = supabase.table("questionnaire_responses") \
        .select("id") \
        .eq("questionnaire_id", q_id) \
        .eq("respondent_id", current_user["user_id"]) \
        .execute()

    if existing_resp.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": True,
                "code": "ALREADY_SUBMITTED",
                "message": "You have already submitted your answers for this questionnaire.",
            },
        )

    # Step 3: Save response
    insert_resp = supabase.table("questionnaire_responses").insert({
        "questionnaire_id": q_id,
        "respondent_id":    current_user["user_id"],
        "answers":          body.answers,
    }).execute()

    if not insert_resp.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "code": "DB_INSERT_FAILED", "message": "Failed to save answers"},
        )

    # Step 4: Write audit log for this specific party answering
    # We write this BEFORE checking if both answered, so the log entry
    # always exists even if the Burst 2 trigger fails.
    action = (
        "REQUESTING_PARTY_ANSWERED"
        if party_role == "requesting_party"
        else "AGAINST_PARTY_ANSWERED"
    )
    supabase.table("audit_logs").insert({
        "case_id":   case_id,
        "actor_id":  current_user["user_id"],
        "action":    action,
        "old_state": CaseState.QUESTIONNAIRE_ACTIVE.value,
        "new_state": CaseState.QUESTIONNAIRE_ACTIVE.value,
        "metadata":  {"questionnaire_id": q_id, "answers_count": len(body.answers)},
    }).execute()

    # Step 5: Count how many parties have now answered this questionnaire
    all_responses = supabase.table("questionnaire_responses") \
        .select("id") \
        .eq("questionnaire_id", q_id) \
        .execute()

    response_count = len(all_responses.data) if all_responses.data else 0

    logger.info(
        f"Case {case_id}: {party_role} submitted questionnaire answers. "
        f"Response count: {response_count}/2"
    )

    # Step 6: If both parties answered — trigger Burst 2
    if response_count >= 2:
        # Transition case to QUESTIONNAIRE_COMPLETE
        transition(
            case_id=case_id,
            new_state=CaseState.QUESTIONNAIRE_COMPLETE,
            actor_id="system",
            metadata={"questionnaire_id": q_id, "trigger": "both_parties_answered"},
        )

        # Fire Celery Burst 2 task (Niharika's process_burst_2)
        # We import here (not at top of file) to avoid circular imports
        # and to fail gracefully if Celery is not running
        try:
            from tasks import process_burst_2
            process_burst_2.delay(case_id)
            logger.info(f"Case {case_id}: Burst 2 triggered after both parties answered questionnaire")
            burst_2_triggered = True
        except Exception as e:
            # Log the error but DO NOT crash the endpoint.
            # The questionnaire response was already saved.
            # The case is already in QUESTIONNAIRE_COMPLETE.
            # A retry endpoint exists for the mediator to manually re-trigger.
            logger.error(
                f"Case {case_id}: Failed to trigger Burst 2 Celery task: {e}. "
                f"Case is in QUESTIONNAIRE_COMPLETE — mediator can retry manually."
            )
            burst_2_triggered = False

        return {
            "status": "questionnaire_complete",
            "burst_2_triggered": burst_2_triggered,
            "message": "Both parties have answered. AI analysis (Burst 2) has been triggered." if burst_2_triggered
                       else "Both parties have answered. Burst 2 could not be triggered automatically — mediator can retry.",
        }

    # Only one party has answered so far
    return {
        "status": "submitted",
        "waiting_for_other_party": True,
        "responses_received": response_count,
        "responses_needed": 2,
        "message": "Your answers have been saved. Waiting for the other party to complete their questionnaire.",
    }


# ── ENDPOINT 4: Mediator views all responses ──────────────────────────────────

@router.get(
    "/cases/{case_id}/questionnaires/{q_id}/responses",
    summary="Mediator views all questionnaire responses (both parties side by side)",
)
async def get_questionnaire_responses(
    case_id: str,
    q_id:    str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    """
    Returns all questionnaire responses for mediator review.
    This is what powers the three-column table on the mediator's
    BATNA/WATNA screen: Question | Party A answer | Party B answer

    WHY mediator only:
        Parties must never see each other's answers. RLS enforces this at
        database level, and this endpoint enforces it at application level.
        Two layers of protection, as per the three-layer security model.
    """
    _verify_mediator_owns_case(case_id, current_user["user_id"])

    # Fetch all responses for this questionnaire
    responses_resp = supabase.table("questionnaire_responses") \
        .select("respondent_id, answers, submitted_at") \
        .eq("questionnaire_id", q_id) \
        .execute()

    responses = responses_resp.data or []

    # Fetch the questionnaire questions for context
    q_resp = supabase.table("questionnaires") \
        .select("questions") \
        .eq("id", q_id) \
        .single() \
        .execute()

    questions = []
    if q_resp.data:
        questions = q_resp.data.get("questions", {}).get("questions", [])

    # Map respondent_id to their role in the case
    # (so the mediator sees "Requesting Party" and "Against Party", not UUIDs)
    role_map = {}
    for r in responses:
        try:
            inv = supabase.table("case_invitations") \
                .select("invitation_role") \
                .eq("case_id", case_id) \
                .eq("accepted_by", r["respondent_id"]) \
                .single() \
                .execute()
            if inv.data:
                role_map[r["respondent_id"]] = inv.data["invitation_role"]
        except Exception:
            role_map[r["respondent_id"]] = "unknown"

    # Build response with role labels
    labelled_responses = []
    for r in responses:
        labelled_responses.append({
            "party_role":    role_map.get(r["respondent_id"], "unknown"),
            "answers":       r["answers"],
            "submitted_at":  r["submitted_at"],
        })

    return {
        "questionnaire_id":  q_id,
        "questions":         questions,
        "responses":         labelled_responses,
        "responses_received": len(responses),
        "both_answered":     len(responses) >= 2,
    }