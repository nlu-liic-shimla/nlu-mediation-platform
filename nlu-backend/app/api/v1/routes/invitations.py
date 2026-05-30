from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Invitations"])


def hash_token(raw_token: str) -> str:
    """SHA-256 hash of raw token. Only this hash is stored, never the raw token."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


class InviteRequest(BaseModel):
    email: str


class AcceptRequest(BaseModel):
    email: str
    password: str


# ENDPOINT 1: Mediator generates invite link
@router.post("/cases/{case_id}/invite", status_code=201)
async def create_invitation(
    case_id: str,
    body: InviteRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    # Check case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    # Generate secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()

    result = supabase.table("case_invitations").insert({
        "case_id": case_id,
        "invited_email": body.email,
        "token_hash": token_hash,
        "role": "against_party",
        "expires_at": expires_at,
        "created_by": current_user["user_id"]
    }).execute()

    # Return raw token ONCE — never stored
    return {
        "token": raw_token,
        "expires_at": expires_at,
        "invitation_id": result.data[0]["id"]
    }


# ENDPOINT 2: Against party previews case via token
@router.get("/invitations/{token}")
async def preview_invitation(token: str):
    token_hash = hash_token(token)

    try:
        result = supabase.table("case_invitations").select(
            "*, cases(title, status)"
        ).eq("token_hash", token_hash).single().execute()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "INVITATION_NOT_FOUND"}
        )

    invitation = result.data

    # Check expiry
    expires_at = datetime.fromisoformat(
        invitation["expires_at"].replace("Z", "+00:00")
    )
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_EXPIRED"}
        )

    # Check already accepted
    if invitation["accepted_at"]:
        raise HTTPException(
            status_code=409,
            detail={"error": True, "code": "INVITATION_ALREADY_ACCEPTED"}
        )

    return {
        "case_id": invitation["case_id"],
        "status": "pending",
        "expires_at": invitation["expires_at"]
    }


# ENDPOINT 3: Against party accepts invite and gets JWT
@router.post("/invitations/{token}/accept")
async def accept_invitation(token: str, body: AcceptRequest):
    token_hash = hash_token(token)

    try:
        result = supabase.table("case_invitations").select(
            "*"
        ).eq("token_hash", token_hash).single().execute()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "INVITATION_NOT_FOUND"}
        )

    invitation = result.data

    # Check expiry
    expires_at = datetime.fromisoformat(
        invitation["expires_at"].replace("Z", "+00:00")
    )
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=410,
            detail={"error": True, "code": "INVITATION_EXPIRED"}
        )

    # Check already accepted
    if invitation["accepted_at"]:
        raise HTTPException(
            status_code=409,
            detail={"error": True, "code": "INVITATION_ALREADY_ACCEPTED"}
        )

    # Check if user exists or create new one
    existing_user = supabase.table("users").select(
        "*"
    ).eq("email", body.email).execute()

    if existing_user.data:
        user_id = existing_user.data[0]["id"]
    else:
        from app.core.security import hash_password
        new_user = supabase.table("users").insert({
            "email": body.email,
            "password_hash": hash_password(body.password),
            "role": "against_party"
        }).execute()
        user_id = new_user.data[0]["id"]

    # Mark invitation as accepted
    supabase.table("case_invitations").update({
        "accepted_at": datetime.now(timezone.utc).isoformat()
    }).eq("token_hash", token_hash).execute()

    # Create JWT token
    from app.core.security import create_access_token
    token_data = {
        "sub": user_id,
        "role": "against_party",
        "case_id": invitation["case_id"]
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "case_id": invitation["case_id"]
    }