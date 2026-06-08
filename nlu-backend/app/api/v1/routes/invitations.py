# app/api/v1/routes/invitations.py
# Updated: Week 3 - added decline endpoint + invitation_attempt_count tracking

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Invitations"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def hash_token(raw_token: str) -> str:
    """SHA-256 hash of raw token. Only this hash is stored, never the raw token."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def get_valid_invitation(token_hash: str) -> dict:
    """
    Shared helper — fetches and validates an invitation by token hash.
    Raises correct HTTP errors for expired, used, or not found tokens.
    Used by preview, accept, and decline endpoints.
    """
    try:
        result = supabase.table("case_invitations").select(
            "*, cases(dispute_type, brief_description, assigned_mediator)"
        ).eq("token_hash", token_hash).single().execute()
    except Exception:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_NOT_FOUND"}
        )

    invitation = result.data

    expires_at_str = invitation["expires_at"].replace("Z", "+00:00")
    expires_at = datetime.fromisoformat(expires_at_str)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_EXPIRED"}
        )

    if invitation.get("accepted_at"):
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_ALREADY_ACCEPTED"}
        )

    return invitation


# ── Request models ─────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    invitation_role: str = "against_party"


class AcceptRequest(BaseModel):
    password: str
    full_name: Optional[str] = None


class DeclineRequest(BaseModel):
    reason: Optional[str] = None   # optional — party doesn't have to explain


# ── ENDPOINT 1: Mediator generates invite link ─────────────────────────────────

@router.post("/cases/{case_id}/invite", status_code=201)
async def create_invitation(
    case_id: str,
    body: InviteRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Mediator generates a one-time invitation link for a party.
    Raw token returned ONCE — never stored in DB (only SHA-256 hash stored).
    """
    case_result = supabase.table("cases").select(
        "id, assigned_mediator"
    ).eq("id", case_id).execute()

    if not case_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    if case_result.data[0]["assigned_mediator"] != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail={"error": True, "code": "FORBIDDEN"}
        )

    if body.invitation_role not in ["requesting_party", "against_party"]:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "code": "VALIDATION_ERROR",
                "message": "invitation_role must be requesting_party or against_party"
            }
        )

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()

    result = supabase.table("case_invitations").insert({
        "case_id": case_id,
        "invited_email": body.email,
        "token_hash": token_hash,
        "invitation_role": body.invitation_role,
        "expires_at": expires_at,
        "created_by": current_user["user_id"],
        "accepted_at": None,
        "accepted_by": None,
        "invitation_attempt_count": 0,
    }).execute()

    # Audit log
    supabase.table("audit_logs").insert({
        "case_id": case_id,
        "actor_id": current_user["user_id"],
        "action": "INVITATION_GENERATED",
        "old_state": None,
        "new_state": None,
        "metadata": {
            "invited_email": body.email,
            "invitation_role": body.invitation_role,
            "expires_at": expires_at
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    logger.info(f"Invitation generated for case {case_id} ({body.invitation_role}) → {body.email}")

    return {
        "token": raw_token,
        "expires_at": expires_at,
        "invitation_id": result.data[0]["id"],
        "invitation_role": body.invitation_role,
        "message": "Copy this token now — it will not be shown again"
    }


# ── ENDPOINT 2: Party previews case via token (no auth required) ───────────────

@router.get("/invitations/{token}")
async def preview_invitation(token: str):
    """
    Public endpoint — no JWT required.
    Party opens invite link, sees case preview before consenting.
    Returns only non-sensitive preview data.
    """
    token_hash = hash_token(token)
    invitation = get_valid_invitation(token_hash)

    # Get mediator name
    mediator_name = "Your Mediator"
    if invitation["cases"].get("assigned_mediator"):
        mediator_result = supabase.table("users").select(
            "full_name, email"
        ).eq("id", invitation["cases"]["assigned_mediator"]).execute()

        if mediator_result.data:
            mediator_name = (
                mediator_result.data[0].get("full_name")
                or mediator_result.data[0].get("email")
                or "Your Mediator"
            )

    return {
        "case_id": invitation["case_id"],
        "dispute_type": invitation["cases"].get("dispute_type"),
        "brief_description": invitation["cases"].get("brief_description"),
        "mediator_name": mediator_name,
        "invitation_role": invitation.get("invitation_role"),
        "invited_email": invitation.get("invited_email"),
        "expires_at": invitation["expires_at"],
        "status": "pending"
    }


# ── ENDPOINT 3: Party accepts invite and gets JWT ──────────────────────────────

@router.post("/invitations/{token}/accept")
async def accept_invitation(token: str, body: AcceptRequest):
    """
    Public endpoint — no JWT required.
    Creates or links user account. Returns JWT + case_id + role_in_case.

    Frontend after this call:
        localStorage.setItem('nlu_token', access_token)
        localStorage.setItem('nlu_active_case', case_id)
        Then redirect to intake wizard.
    """
    from app.core.security import hash_password, verify_password, create_access_token

    token_hash = hash_token(token)
    invitation = get_valid_invitation(token_hash)

    # ── Create or link user ────────────────────────────────────────────────────
    existing_user = supabase.table("users").select(
        "id, email, password_hash, role"
    ).eq("email", invitation["invited_email"]).execute()

    if existing_user.data:
        user = existing_user.data[0]
        if not verify_password(body.password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail={
                    "error": True,
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid password for existing account"
                }
            )
        user_id = user["id"]
        is_new_user = False
    else:
        if not body.full_name:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": True,
                    "code": "FULL_NAME_REQUIRED",
                    "message": "full_name is required when creating a new account"
                }
            )

        new_user = supabase.table("users").insert({
            "email": invitation["invited_email"],
            "password_hash": hash_password(body.password),
            "full_name": body.full_name,
            "role": "party_user",
        }).execute()

        if not new_user.data:
            raise HTTPException(
                status_code=500,
                detail={"error": True, "code": "USER_CREATION_FAILED"}
            )

        user_id = new_user.data[0]["id"]
        is_new_user = True

    # ── Mark accepted ──────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    supabase.table("case_invitations").update({
        "accepted_at": now,
        "accepted_by": user_id,
    }).eq("token_hash", token_hash).execute()

    # ── Audit log ──────────────────────────────────────────────────────────────
    supabase.table("audit_logs").insert({
        "case_id": invitation["case_id"],
        "actor_id": user_id,
        "action": "INVITATION_ACCEPTED",
        "old_state": None,
        "new_state": None,
        "metadata": {
            "invitation_role": invitation.get("invitation_role"),
            "is_new_user": is_new_user,
            "consent_given": True,
            "consent_at": now,
        },
        "created_at": now
    }).execute()

    # ── Generate JWT ───────────────────────────────────────────────────────────
    access_token = create_access_token(data={
        "sub": str(user_id),
        "role": "party_user",
        "email": invitation["invited_email"]
    })

    logger.info(
        f"Invitation accepted for case {invitation['case_id']} "
        f"by user {user_id} ({'new' if is_new_user else 'existing'} account)"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "case_id": invitation["case_id"],
        "role_in_case": invitation.get("invitation_role"),
        "is_new_user": is_new_user
    }


# ── ENDPOINT 4: Party declines invite ─────────────────────────────────────────

@router.post("/invitations/{token}/decline")
async def decline_invitation(token: str, body: DeclineRequest):
    """
    Public endpoint — no JWT required.
    Party declines the invitation.

    Per flow doc:
    - Token stays valid for 72-hour window after decline
    - Party can change mind and re-open link before expiry
    - invitation_attempt_count increments on each decline
    - After 3 total declines/expiries → mediator sees MEDIATION_FAILED warning
    """
    token_hash = hash_token(token)

    # Get invitation — but don't block on accepted status
    # (party might have declined previously and is declining again)
    try:
        result = supabase.table("case_invitations").select(
            "*"
        ).eq("token_hash", token_hash).single().execute()
    except Exception:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_NOT_FOUND"}
        )

    invitation = result.data

    # Check expiry
    expires_at_str = invitation["expires_at"].replace("Z", "+00:00")
    expires_at = datetime.fromisoformat(expires_at_str)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_EXPIRED"}
        )

    # Check not already accepted
    if invitation.get("accepted_at"):
        raise HTTPException(
            status_code=409,
            detail={"error": True, "code": "INVITATION_ALREADY_ACCEPTED"}
        )

    # Increment attempt count
    current_count = invitation.get("invitation_attempt_count") or 0
    new_count = current_count + 1

    now = datetime.now(timezone.utc).isoformat()

    supabase.table("case_invitations").update({
        "invitation_attempt_count": new_count,
        "declined_at": now,
    }).eq("token_hash", token_hash).execute()

    # Audit log
    supabase.table("audit_logs").insert({
        "case_id": invitation["case_id"],
        "actor_id": "anonymous",
        "action": "INVITATION_DECLINED",
        "old_state": None,
        "new_state": None,
        "metadata": {
            "invitation_role": invitation.get("invitation_role"),
            "attempt_count": new_count,
            "reason": body.reason,
        },
        "created_at": now
    }).execute()

    # Check if 3 attempts reached — notify mediator via case flag
    # Per flow doc: after 3 total declines/expiries → MEDIATION_FAILED warning
    if new_count >= 3:
        logger.warning(
            f"Case {invitation['case_id']}: invitation declined {new_count} times — "
            f"mediator should be notified"
        )
        # Flag on case for mediator dashboard
        # Full MEDIATION_FAILED transition is mediator-triggered (they click Close Case)
        supabase.table("cases").update({
            "against_party_declined": True,   # mediator dashboard reads this
        }).eq("id", invitation["case_id"]).execute()

    logger.info(
        f"Invitation declined for case {invitation['case_id']} "
        f"(attempt {new_count} of 3)"
    )

    return {
        "declined": True,
        "message": "You have declined this invitation. Contact your mediator if you change your mind within 72 hours.",
        "token_still_valid": True,  # party can re-open link before expiry
        "attempt_count": new_count
    }


# ── ENDPOINT 5: Mediator regenerates invitation link ──────────────────────────

@router.post("/cases/{case_id}/invitations/regenerate")
async def regenerate_invitation(
    case_id: str,
    body: InviteRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    """
    Invalidates old token immediately and generates a new one.
    Mediator must confirm before calling — frontend shows warning modal.
    """
    case_result = supabase.table("cases").select(
        "assigned_mediator"
    ).eq("id", case_id).execute()

    if not case_result.data:
        raise HTTPException(status_code=404, detail={"error": True, "code": "CASE_NOT_FOUND"})

    if case_result.data[0]["assigned_mediator"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail={"error": True, "code": "FORBIDDEN"})

    # Delete old unaccepted invitation for this role
    existing = supabase.table("case_invitations").select(
        "id"
    ).eq("case_id", case_id).eq(
        "invitation_role", body.invitation_role
    ).is_("accepted_at", "null").execute()

    if existing.data:
        supabase.table("case_invitations").delete().eq(
            "id", existing.data[0]["id"]
        ).execute()

        supabase.table("audit_logs").insert({
            "case_id": case_id,
            "actor_id": current_user["user_id"],
            "action": "INVITATION_REGENERATED",
            "old_state": None,
            "new_state": None,
            "metadata": {
                "invitation_role": body.invitation_role,
                "reason": "Mediator regenerated link — old token invalidated"
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

    # Generate new token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()

    result = supabase.table("case_invitations").insert({
        "case_id": case_id,
        "invited_email": body.email,
        "token_hash": token_hash,
        "invitation_role": body.invitation_role,
        "expires_at": expires_at,
        "created_by": current_user["user_id"],
        "invitation_attempt_count": 0,
    }).execute()

    return {
        "token": raw_token,
        "expires_at": expires_at,
        "invitation_id": result.data[0]["id"],
        "message": "Old link invalidated. Copy new token now — not shown again."
    }