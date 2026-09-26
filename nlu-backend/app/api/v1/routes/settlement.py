"""
Settlement Routes — Backend Role 2
NLU Mediation Platform | Week 4

Endpoints:
    POST /api/v1/cases/{case_id}/settlement/confirm  — party submits typed name + signature
    GET  /api/v1/cases/{case_id}/settlement/pdf      — get signed URL for settlement PDF
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cases", tags=["Settlement"])

BUCKET_NAME = "case-documents"
SIGNATURE_MAX_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_SIGNATURE_TYPES = {"image/jpeg", "image/png"}
PDF_SIGNED_URL_EXPIRY = 86400  # 24 hours


# ─────────────────────────────────────────────
# POST /api/v1/cases/{case_id}/settlement/confirm
# Party only — submits typed full name + signature image
# After both confirm, triggers PDF generation
# ─────────────────────────────────────────────
@router.post(
    "/{case_id}/settlement/confirm",
    status_code=status.HTTP_200_OK,
    summary="Submit settlement confirmation",
    description=(
        "Party submits their typed full name and signature image to confirm the settlement. "
        "After both parties confirm, the settlement PDF is generated automatically."
    )
)
async def confirm_settlement(
    case_id: str,
    full_name: str = Form(...),
    signature: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_role(["party_user"]))
):
    user_id = current_user["user_id"]

    # Verify case exists and is in correct state
    case_result = supabase.table("cases") \
        .select("id, status, finalised_at") \
        .eq("id", case_id) \
        .single() \
        .execute()

    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    case_status = case_result.data["status"]
    if case_status != "MEDIATION_COMPLETE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Settlement confirmation not available. Case is in state '{case_status}'. "
                   f"Confirmation is only available when state is MEDIATION_COMPLETE."
        )

    # BUG #31 FIX: status alone isn't enough — it's MEDIATION_COMPLETE both before AND
    # after the mediator finalises. Without this check, parties could confirm settlement
    # before the mediator ever clicked "Finalise Case", causing indefinite polling.
    if not case_result.data.get("finalised_at"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your mediator has not yet finalised this case. Please wait to be notified before confirming."
        )

    # Validate full name
    if not full_name or len(full_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name must be at least 2 characters"
        )

    # Check if party already confirmed
    existing = supabase.table("settlement_confirmations") \
        .select("id") \
        .eq("case_id", case_id) \
        .eq("party_id", user_id) \
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already confirmed this settlement"
        )

    # Signature upload is optional — only process if a file was provided
    signature_path = None
    if signature is not None:
        if signature.content_type not in ALLOWED_SIGNATURE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signature must be a JPEG or PNG image"
            )

        signature_bytes = await signature.read()
        if len(signature_bytes) > SIGNATURE_MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signature image must be under 2MB"
            )

        ext = "jpg" if signature.content_type == "image/jpeg" else "png"
        signature_path = f"{case_id}/signature_{user_id[:8]}.{ext}"

        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=signature_path,
                file=signature_bytes,
                file_options={"content-type": signature.content_type, "upsert": "true"}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload signature: {str(e)}"
            )

    # Save confirmation record
    try:
        supabase.table("settlement_confirmations").insert({
            "case_id": case_id,
            "party_id": user_id,
            "typed_name": full_name.strip(),
            "signature_url": signature_path,
        }).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save confirmation: {str(e)}"
        )

   

    # Check if both parties have now confirmed
    all_confirmations = supabase.table("settlement_confirmations") \
        .select("id") \
        .eq("case_id", case_id) \
        .execute()

    both_confirmed = len(all_confirmations.data or []) >= 2

    if both_confirmed:
        # Trigger PDF generation as background Celery task
        try:
            from tasks import generate_settlement_pdf_task
            generate_settlement_pdf_task.delay(case_id)
            logger.info(f"[Settlement] Both parties confirmed for case {case_id} — PDF generation queued")
        except Exception as e:
            # PDF generation failure should not block the confirmation response
            logger.error(f"[Settlement] Failed to queue PDF generation for case {case_id}: {e}")

    return {
        "status": "confirmed",
        "case_id": case_id,
        "party_id": user_id,
        "pdf_generation_queued": both_confirmed,
        "message": (
            "Both parties have confirmed. Settlement PDF is being generated."
            if both_confirmed
            else "Your confirmation has been recorded. Waiting for the other party."
        )
    }


# ─────────────────────────────────────────────
# GET /api/v1/cases/{case_id}/settlement/pdf
# All roles — returns signed URL for the settlement PDF
# ─────────────────────────────────────────────
@router.get(
    "/{case_id}/settlement/pdf",
    status_code=status.HTTP_200_OK,
    summary="Get settlement PDF download URL",
    description=(
        "Returns a signed URL for the settlement PDF valid for 24 hours. "
        "Available to both parties and the mediator after both parties confirm."
    )
)
async def get_settlement_pdf(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify case exists
    case_result = supabase.table("cases") \
        .select("id") \
        .eq("id", case_id) \
        .single() \
        .execute()

    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check if PDF has been generated
    report_result = supabase.table("mediation_reports") \
        .select("pdf_url, generated_at") \
        .eq("case_id", case_id) \
        .order("generated_at", desc=True) \
        .limit(1) \
        .execute()

    if not report_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement PDF not yet generated. Both parties must confirm first."
        )

    pdf_url = report_result.data[0]["pdf_url"]

    # Generate signed URL valid for 24 hours
    try:
        signed_resp = supabase.storage.from_(BUCKET_NAME).create_signed_url(
            pdf_url,
            PDF_SIGNED_URL_EXPIRY
        )
        signed_url = (
            signed_resp.get("signedURL")
            or signed_resp.get("signed_url")
            or ""
        )

        if not signed_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download URL"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL: {str(e)}"
        )

    return {
        "pdf_url": signed_url,
        "generated_at": report_result.data[0]["generated_at"],
        "expires_in": PDF_SIGNED_URL_EXPIRY,
    }