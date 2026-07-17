# app/api/v1/routes/proposals.py
# Week 4 - BATNA/WATNA endpoint + all Proposal endpoints + Settlement status + Audit log

import logging
import sys
import os
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.core.state_machine import transition, CaseState

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Proposals"])


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class ProposalUpdate(BaseModel):
    content: str

class ProposalRespond(BaseModel):
    decision: str            # "accepted" or "rejected"
    rejection_reason: Optional[str] = None

class ExtendRounds(BaseModel):
    reason: str

class SettlementConfirmBody(BaseModel):
    typed_name: str
    # signature_url is sent by Backend 2 after file upload to Supabase Storage


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _verify_mediator_owns_case(case_id: str, mediator_id: str) -> dict:
    case_resp = supabase.table("cases") \
        .select("id, status, assigned_mediator, negotiation_round, max_rounds, mediator_notes") \
        .eq("id", case_id).single().execute()
    if not case_resp.data:
        raise HTTPException(status_code=404, detail={"error": True, "code": "CASE_NOT_FOUND", "message": "Case not found"})
    if case_resp.data["assigned_mediator"] != mediator_id:
        raise HTTPException(status_code=403, detail={"error": True, "code": "FORBIDDEN", "message": "You are not the mediator for this case"})
    return case_resp.data


def _get_party_role_in_case(case_id: str, user_id: str) -> str:
    inv = supabase.table("case_invitations") \
        .select("invitation_role") \
        .eq("case_id", case_id) \
        .eq("accepted_by", user_id) \
        .single().execute()
    if not inv.data:
        raise HTTPException(status_code=403, detail={"error": True, "code": "NOT_A_PARTY", "message": "You are not a party on this case"})
    return inv.data["invitation_role"]


def _write_audit(case_id: str, actor_id: str, action: str, old_state: str, new_state: str, metadata: dict = {}):
    supabase.table("audit_logs").insert({
        "case_id":   case_id,
        "actor_id":  actor_id,
        "action":    action,
        "old_state": old_state,
        "new_state": new_state,
        "metadata":  metadata,
        "created_at": datetime.datetime.utcnow().isoformat(),
    }).execute()


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — BATNA/WATNA ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/analysis/batna-watna",
    summary="BATNA/WATNA results — full for mediator, own section only for party",
)
async def get_batna_watna(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Fetch Burst 2 result
    resp = supabase.table("ai_analysis") \
        .select("result, completed_at") \
        .eq("case_id", case_id) \
        .eq("burst_number", 2) \
        .limit(1) \
        .execute()

    first = resp.data[0] if resp.data else None

    if not first or not first.get("result"):
        # Check if questionnaire is still pending — give a helpful status
        case_resp = supabase.table("cases").select("status").eq("id", case_id).single().execute()
        current_status = case_resp.data["status"] if case_resp.data else "unknown"
        return {
            "status": "pending",
            "current_case_status": current_status,
            "message": "BATNA/WATNA analysis not yet complete. Both parties must answer the questionnaire first.",
        }

    batna_data = first["result"]

    # MEDIATOR — sees everything: numeric scores, settlement zone, both parties
    if current_user["role"] == "mediator":
        return {
            "status": "complete",
            **batna_data,
        }

    # PARTY — sees only their own section, labels only, NO numeric scores
    party_role = _get_party_role_in_case(case_id, current_user["user_id"])
    party_key  = "party_a" if party_role == "requesting_party" else "party_b"
    party_data = batna_data.get(party_key, {})

    # If jurisdiction is unclear, show solicitor message instead of labels
    if party_data.get("consult_solicitor_flag", False):
        return {
            "status": "complete",
            "your_position": {
                "consult_solicitor_flag": True,
                "message": "The jurisdictional aspects of your case are unclear. We recommend consulting a solicitor before proceeding.",
            },
            "disclaimer": "This analysis provides negotiation guidance only and does not constitute legal advice.",
        }

    return {
        "status": "complete",
        "your_position": {
            "batna_label":          party_data.get("batna_label"),
            "batna_reasoning":      party_data.get("batna_reasoning"),
            "watna_label":          party_data.get("watna_label"),
            "watna_reasoning":      party_data.get("watna_reasoning"),
            "negotiation_guidance": party_data.get("negotiation_guidance"),
            "consult_solicitor_flag": False,
            # batna_score and watna_score deliberately NOT included — parties never see numbers
        },
        "disclaimer": "This analysis provides negotiation guidance only and does not constitute legal advice. Please consult a qualified legal professional.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — PROPOSAL ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/proposals",
    status_code=201,
    summary="Mediator creates proposal — AI generates the first draft",
)
async def create_proposal(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    case = _verify_mediator_owns_case(case_id, current_user["user_id"])

    # Must be in BURST_2_COMPLETE to create a proposal
    if case["status"] != CaseState.BURST_2_COMPLETE.value:
        # Also allow creating new round proposal from MEDIATION_IN_PROGRESS
        if case["status"] != CaseState.MEDIATION_IN_PROGRESS.value:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": True,
                    "code": "INVALID_CASE_STATE",
                    "message": f"Cannot create proposal. Case must be BURST_2_COMPLETE or MEDIATION_IN_PROGRESS. Currently: {case['status']}",
                },
            )

    # Fetch Burst 1 Conflict Extraction
    b1_resp = supabase.table("ai_analysis") \
        .select("conflict_extraction") \
        .eq("case_id", case_id) \
        .eq("burst_number", 1) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    b1_data = b1_resp.data[0] if b1_resp.data else {}
    conflict = b1_data.get("conflict_extraction", {}) if b1_data else {}

    # Fetch Burst 2 BATNA/WATNA results
    b2_resp = supabase.table("ai_analysis") \
        .select("result") \
        .eq("case_id", case_id) \
        .eq("burst_number", 2) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    b2_data = b2_resp.data[0] if b2_resp.data else {}
    batna_watna = b2_data.get("result", {}) if b2_data else {}

    submissions_resp = supabase.table("submissions") \
        .select("desired_outcome, party_id").eq("case_id", case_id).execute()

    desired_outcomes = {s["party_id"]: s["desired_outcome"] for s in (submissions_resp.data or [])}

    # Call AI draft generation (Vaidant's proposal_draft.py)
    draft_text = ""
    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../"))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        from ai.schemas import ConflictExtraction, BatnaWatnaOutput
        from ai.proposal_draft import generate_proposal_draft

        # Ensure they are Pydantic model objects, not raw dictionaries
        if isinstance(conflict, dict):
            conflict = ConflictExtraction(**conflict)
        if isinstance(batna_watna, dict):
            batna_watna = BatnaWatnaOutput(**batna_watna)

        draft_text = generate_proposal_draft(conflict, batna_watna, desired_outcomes)
        if hasattr(draft_text, "dict"):
            draft_text = str(draft_text)
    except Exception as e:
        logger.warning(f"AI proposal draft generation failed for case {case_id}: {e}. Using empty draft.")
        draft_text = ""

    # Determine round number
    existing = supabase.table("proposals") \
        .select("round").eq("case_id", case_id) \
        .order("round", desc=True).limit(1).execute()
    round = (existing.data[0]["round"] + 1) if existing.data else 1

    # Save proposal as draft
    p_resp = supabase.table("proposals").insert({
        "case_id":      case_id,
        "created_by":   current_user["user_id"],
        "content":     draft_text,
        "status": "draft",
        "round": round,
    }).execute()

    if not p_resp.data:
        raise HTTPException(status_code=500, detail={"error": True, "code": "DB_INSERT_FAILED", "message": "Failed to save proposal"})

    proposal_id = p_resp.data[0]["id"]

    # Fire background structure extraction
    try:
        from tasks import extract_proposal_structure
        extract_proposal_structure.delay(proposal_id)
    except Exception as e:
        logger.warning(f"Could not fire extract_proposal_structure: {e}")

    # Transition to PROPOSAL_DRAFT
    transition(case_id=case_id, new_state=CaseState.PROPOSAL_DRAFT, actor_id=current_user["user_id"])

    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action="PROPOSAL_DRAFT_CREATED",
        old_state=case["status"], new_state=CaseState.PROPOSAL_DRAFT.value,
        metadata={"proposal_id": proposal_id, "round": round},
    )

    return {
        "proposal_id":   proposal_id,
        "draft_text":    draft_text,
        "round":  round,
        "status":        "draft",
    }


@router.patch(
    "/cases/{case_id}/proposals/{proposal_id}",
    summary="Mediator edits proposal draft text",
)
async def update_proposal(
    case_id:     str,
    proposal_id: str,
    body:        ProposalUpdate,
    current_user: dict = Depends(require_role(["mediator"])),
):
    _verify_mediator_owns_case(case_id, current_user["user_id"])

    supabase.table("proposals").update({
        "content":   body.content,
        "updated_at": datetime.datetime.utcnow().isoformat(),
    }).eq("id", proposal_id).execute()

    # Re-extract structure after mediator edits
    try:
        from tasks import extract_proposal_structure
        extract_proposal_structure.delay(proposal_id)
    except Exception as e:
        logger.warning(f"Could not fire extract_proposal_structure after edit: {e}")

    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action="PROPOSAL_DRAFT_SAVED",
        old_state=CaseState.PROPOSAL_DRAFT.value, new_state=CaseState.PROPOSAL_DRAFT.value,
        metadata={"proposal_id": proposal_id},
    )

    return {"status": "saved", "proposal_id": proposal_id}


@router.post(
    "/cases/{case_id}/proposals/{proposal_id}/publish",
    summary="Mediator publishes proposal — parties can now see it",
)
async def publish_proposal(
    case_id:     str,
    proposal_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    case = _verify_mediator_owns_case(case_id, current_user["user_id"])

    # max_rounds guard
    current_round = case.get("negotiation_round") or 0
    max_rounds    = case.get("max_rounds") or 3

    if current_round >= max_rounds:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "ROUNDS_EXHAUSTED",
                "message": f"Maximum negotiation rounds ({max_rounds}) reached. Use extend-rounds to add one more.",
            },
        )

    now = datetime.datetime.utcnow().isoformat()

    supabase.table("proposals").update({
        "status": "published",
        "published_at": now,
    }).eq("id", proposal_id).execute()

    # Increment negotiation_round on the case
    supabase.table("cases").update({
        "negotiation_round": current_round + 1,
        "updated_at": now,
    }).eq("id", case_id).execute()

    transition(case_id=case_id, new_state=CaseState.PROPOSAL_PUBLISHED, actor_id=current_user["user_id"])

    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action="PROPOSAL_PUBLISHED",
        old_state=CaseState.PROPOSAL_DRAFT.value, new_state=CaseState.PROPOSAL_PUBLISHED.value,
        metadata={"proposal_id": proposal_id, "round": current_round + 1},
    )

    return {"status": "published", "proposal_id": proposal_id, "round": current_round + 1}


@router.post(
    "/cases/{case_id}/proposals/{proposal_id}/respond",
    status_code=201,
    summary="Party accepts or rejects proposal. Triggers Sub-system H on rejection.",
)
async def respond_to_proposal(
    case_id:     str,
    proposal_id: str,
    body:        ProposalRespond,
    current_user: dict = Depends(require_role(["party_user"])),
):
    party_role = _get_party_role_in_case(case_id, current_user["user_id"])

    # Validate decision value
    decision_val = body.decision.strip().lower()
    if decision_val in ["accept", "accepted"]:
        decision_val = "accept"
    elif decision_val in ["reject", "rejected"]:
        decision_val = "reject"
    else:
        raise HTTPException(
            status_code=422,
            detail={"error": True, "code": "INVALID_DECISION", "message": "decision must be 'accept/accepted' or 'reject/rejected'"}
        )

    # Rejection requires a reason of at least 20 characters
    if decision_val == "reject":
        if not body.rejection_reason or len(body.rejection_reason.strip()) < 20:
            raise HTTPException(
                status_code=422,
                detail={"error": True, "code": "REJECTION_REASON_TOO_SHORT", "message": "Rejection reason must be at least 20 characters"},
            )

    # Check for duplicate response
    existing = supabase.table("proposal_responses") \
        .select("id").eq("proposal_id", proposal_id) \
        .eq("party_id", current_user["user_id"]).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail={"error": True, "code": "ALREADY_RESPONDED", "message": "You have already responded to this proposal"})

    # Save response
    response_data = {
        "proposal_id": proposal_id,
        "party_id":    current_user["user_id"],
        "decision":    decision_val,
    }
    if decision_val == "reject" and body.rejection_reason:
        response_data["reason"] = body.rejection_reason

    supabase.table("proposal_responses").insert(response_data).execute()

    # Audit log this party's response
    action = "PARTY_ACCEPTED_PROPOSAL" if decision_val == "accept" else "PARTY_REJECTED_PROPOSAL"
    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action=action,
        old_state=CaseState.PROPOSAL_PUBLISHED.value, new_state=CaseState.PROPOSAL_PUBLISHED.value,
        metadata={
            "proposal_id":      proposal_id,
            "party_role":       party_role,
            "rejection_reason": body.rejection_reason,
        },
    )

    # Check if BOTH parties have now responded
    all_responses = supabase.table("proposal_responses") \
        .select("decision").eq("proposal_id", proposal_id).execute()

    if len(all_responses.data) >= 2:
        decisions = [r["decision"] for r in all_responses.data]

        if all(d == "accept" for d in decisions):
            # Both accepted — case complete
            transition(case_id=case_id, new_state=CaseState.MEDIATION_COMPLETE, actor_id="system")
            _write_audit(
                case_id=case_id, actor_id="system",
                action="MEDIATION_COMPLETE",
                old_state=CaseState.PROPOSAL_PUBLISHED.value, new_state=CaseState.MEDIATION_COMPLETE.value,
                metadata={"proposal_id": proposal_id},
            )
            return {"status": "mediation_complete", "message": "Both parties accepted. The mediator has been notified to finalise the case."}

        else:
            # At least one rejection — go to negotiation loop
            transition(case_id=case_id, new_state=CaseState.MEDIATION_IN_PROGRESS, actor_id="system")

            # Fire Sub-system H to generate revision suggestions
            try:
                from tasks import generate_proposal_revision
                generate_proposal_revision.delay(case_id, proposal_id)
                h_triggered = True
            except Exception as e:
                logger.error(f"Could not trigger generate_proposal_revision: {e}")
                h_triggered = False

            _write_audit(
                case_id=case_id, actor_id="system",
                action="MEDIATION_IN_PROGRESS",
                old_state=CaseState.PROPOSAL_PUBLISHED.value, new_state=CaseState.MEDIATION_IN_PROGRESS.value,
                metadata={"proposal_id": proposal_id, "revision_triggered": h_triggered},
            )
            return {
                "status":             "mediation_in_progress",
                "revision_triggered": h_triggered,
                "message":            "Proposal rejected. The mediator will prepare a revised proposal.",
            }

    # Only one party responded so far
    return {
        "status":  "response_recorded",
        "waiting": True,
        "message": "Your response has been recorded. Waiting for the other party.",
    }


@router.get(
    "/cases/{case_id}/proposals",
    summary="Get proposals. Mediator sees all. Party sees published only.",
)
async def get_proposals(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] == "mediator":
        resp = supabase.table("proposals").select("*") \
            .eq("case_id", case_id).order("round").execute()
    else:
        # Party only sees published proposals — this is also enforced by RLS in DB
        _get_party_role_in_case(case_id, current_user["user_id"])  # verify they belong
        resp = supabase.table("proposals").select("id, content, round, published_at") \
            .eq("case_id", case_id).eq("status", "published").order("round").execute()

    return resp.data or []


# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — SETTLEMENT STATUS + AUDIT LOG + MAX ROUNDS OVERRIDE + FINALISE
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/proposals/extend-rounds",
    summary="Mediator extends max rounds by 1. Mandatory reason required. Logged permanently.",
    operation_id="extend_rounds_post",
)
async def extend_rounds(
    case_id: str,
    body:    ExtendRounds,
    current_user: dict = Depends(require_role(["mediator"])),
):
    case = _verify_mediator_owns_case(case_id, current_user["user_id"])

    if not body.reason or len(body.reason.strip()) == 0:
        raise HTTPException(status_code=422, detail={"error": True, "code": "REASON_REQUIRED", "message": "A reason is required to extend rounds"})

    current_max = case.get("max_rounds") or 3
    new_max     = current_max + 1

    supabase.table("cases").update({"max_rounds": new_max}).eq("id", case_id).execute()

    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action="ROUNDS_EXTENDED",
        old_state=case["status"], new_state=case["status"],
        metadata={"reason": body.reason, "old_max_rounds": current_max, "new_max_rounds": new_max},
    )

    return {"new_max_rounds": new_max, "reason_logged": True}


@router.post(
    "/cases/{case_id}/finalise",
    summary="Mediator finalises case after both parties accept. Notifies parties to confirm.",
)
async def finalise_case(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    case = _verify_mediator_owns_case(case_id, current_user["user_id"])

    if case["status"] != CaseState.MEDIATION_COMPLETE.value:
        raise HTTPException(
            status_code=409,
            detail={"error": True, "code": "INVALID_CASE_STATE", "message": f"Case must be MEDIATION_COMPLETE to finalise. Currently: {case['status']}"},
        )

    # Self-transition — status stays MEDIATION_COMPLETE, but audit log records mediator's action
    transition(case_id=case_id, new_state=CaseState.MEDIATION_COMPLETE, actor_id=current_user["user_id"])

    _write_audit(
        case_id=case_id, actor_id=current_user["user_id"],
        action="CASE_FINALISED",
        old_state=CaseState.MEDIATION_COMPLETE.value, new_state=CaseState.MEDIATION_COMPLETE.value,
        metadata={},
    )

    return {"status": "finalised", "message": "Both parties have been notified to confirm the settlement."}


@router.get(
    "/cases/{case_id}/settlement/status",
    summary="Per-party settlement confirmation status. Frontend polls this for PDF activation.",
)
async def settlement_status(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Get both parties from case_invitations
    parties_resp = supabase.table("case_invitations") \
        .select("accepted_by, invitation_role") \
        .eq("case_id", case_id) \
        .not_.is_("accepted_by", "null").execute()

    # Get existing confirmations
    confs_resp = supabase.table("settlement_confirmations") \
        .select("party_id, confirmed_at").eq("case_id", case_id).execute()

    confirmed_map = {
        c["party_id"]: c["confirmed_at"]
        for c in (confs_resp.data or [])
    }

    result = {}
    for p in (parties_resp.data or []):
        uid  = p["accepted_by"]
        role = p["invitation_role"]
        result[role] = {
            "confirmed":    uid in confirmed_map,
            "confirmed_at": confirmed_map.get(uid),
        }

    # Check if PDF is ready
    pdf_resp = supabase.table("mediation_reports") \
        .select("pdf_url").eq("case_id", case_id).execute()

    pdf_ready = bool(pdf_resp.data)
    pdf_url = None
    if pdf_ready:
        try:
            signed_resp = supabase.storage.from_("case-documents").create_signed_url(
                pdf_resp.data[0]["pdf_url"], 86400
            )
            pdf_url = (
                signed_resp.get("signedURL")
                or signed_resp.get("signed_url")
                or pdf_resp.data[0]["pdf_url"]
            )
        except Exception as e:
            logger.error(f"Failed to generate signed URL for settlement status: {e}")
            pdf_url = pdf_resp.data[0]["pdf_url"]

    return {
        **result,
        "pdf_ready":  pdf_ready,
        "pdf_url":    pdf_url,
    }


@router.get(
    "/cases/{case_id}/audit-log",
    summary="Full audit log for a case. Mediator only. Read only.",
)
async def get_audit_log(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    _verify_mediator_owns_case(case_id, current_user["user_id"])

    resp = supabase.table("audit_logs") \
        .select("action, old_state, new_state, actor_id, metadata, created_at") \
        .eq("case_id", case_id) \
        .order("created_at", desc=True) \
        .execute()

    return resp.data or []


@router.patch(
    "/cases/{case_id}/notes",
    summary="Mediator saves private notes. Never shown to parties.",
)
async def save_notes(
    case_id: str,
    body:    dict,
    current_user: dict = Depends(require_role(["mediator"])),
):
    _verify_mediator_owns_case(case_id, current_user["user_id"])

    supabase.table("cases").update({
        "mediator_notes": body.get("notes", ""),
        "updated_at":     datetime.datetime.utcnow().isoformat(),
    }).eq("id", case_id).execute()

    return {"status": "saved"}


@router.get(
    "/cases/{case_id}/notes",
    summary="Mediator retrieves private notes.",
)
async def get_notes(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"])),
):
    _verify_mediator_owns_case(case_id, current_user["user_id"])

    resp = supabase.table("cases").select("mediator_notes").eq("id", case_id).single().execute()
    return {"notes": resp.data.get("mediator_notes", "") if resp.data else ""}