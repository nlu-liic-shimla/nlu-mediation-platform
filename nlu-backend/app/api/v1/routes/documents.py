"""
Document Routes — Backend Role 2
NLU Mediation Platform | Week 2 + Week 3

Endpoints:
    POST /api/v1/cases/{case_id}/documents/upload-url     — get signed URL for upload
    POST /api/v1/cases/{case_id}/documents/confirm        — confirm upload, save metadata
    GET  /api/v1/cases/{case_id}/documents                — list documents with signed GET URLs (mediator only, grouped by party)
    POST /api/v1/cases/{case_id}/analysis/retry-full      — retry full Burst 1 pipeline (mediator only)
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.models.documents import (
    UploadUrlRequest, UploadUrlResponse,
    DocumentConfirmRequest, DocumentResponse, DocumentListResponse,
    DocumentWithSignedUrl, DocumentsByPartyResponse
)
import uuid

router = APIRouter(prefix="/cases", tags=["Documents"])

BUCKET_NAME = "case-documents"
SIGNED_URL_EXPIRY = 600      # 10 minutes — for upload URLs
SIGNED_GET_URL_EXPIRY = 3600  # 1 hour — for mediator split screen view URLs

# Max file sizes in bytes
MAX_FILE_SIZES = {
    "application/pdf": 20 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 10 * 1024 * 1024,
    "image/jpeg": 5 * 1024 * 1024,
    "image/png": 5 * 1024 * 1024,
}


# ─────────────────────────────────────────────
# POST /api/v1/cases/{case_id}/documents/upload-url
# Party only — generates a signed URL for direct upload to Supabase Storage
# ─────────────────────────────────────────────
@router.post(
    "/{case_id}/documents/upload-url",
    response_model=UploadUrlResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get signed URL for document upload",
    description="Returns a signed PUT URL valid for 10 minutes. Party uploads directly to Supabase Storage."
)
async def get_upload_url(
    case_id: str,
    request: UploadUrlRequest,
    current_user: dict = Depends(require_role(["requesting_party", "against_party"]))
):
    # Verify case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Validate file type
    if request.file_type not in MAX_FILE_SIZES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: PDF, DOCX, JPEG, PNG"
        )

    # Validate file size
    max_size = MAX_FILE_SIZES[request.file_type]
    if request.file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size for {request.file_type}: {max_size // (1024*1024)}MB"
        )

    # Build storage path: case-documents/{case_id}/{unique_id}_{file_name}
    unique_id = str(uuid.uuid4())[:8]
    storage_path = f"{case_id}/{unique_id}_{request.file_name}"

    # Generate signed URL from Supabase Storage
    try:
        signed_url_response = supabase.storage.from_(BUCKET_NAME).create_signed_upload_url(
            storage_path
        )
        signed_url = signed_url_response.get("signedURL") or signed_url_response.get("signed_url")

        if not signed_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate signed URL"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage error: {str(e)}"
        )

    return UploadUrlResponse(
        signed_url=signed_url,
        storage_path=storage_path,
        expires_in=SIGNED_URL_EXPIRY
    )


# ─────────────────────────────────────────────
# POST /api/v1/cases/{case_id}/documents/confirm
# Party only — saves document metadata to DB after successful upload
# ─────────────────────────────────────────────
@router.post(
    "/{case_id}/documents/confirm",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm document upload and save metadata",
    description="Called after party successfully uploads file to signed URL. Saves metadata to documents table."
)
async def confirm_upload(
    case_id: str,
    request: DocumentConfirmRequest,
    current_user: dict = Depends(require_role(["requesting_party", "against_party"]))
):
    # Verify case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Save document metadata to documents table
    document = {
        "case_id": case_id,
        "uploaded_by": current_user["user_id"],
        "file_name": request.file_name,
        "file_size": request.file_size,
        "file_type": request.file_type,
        "storage_path": request.storage_path,
    }

    result = supabase.table("documents").insert(document).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save document metadata"
        )

    return DocumentResponse(**result.data[0])


# ─────────────────────────────────────────────
# GET /api/v1/cases/{case_id}/documents
# Week 3 — mediator only, signed GET URLs grouped by party
# ─────────────────────────────────────────────
@router.get(
    "/{case_id}/documents",
    response_model=DocumentsByPartyResponse,
    summary="List documents grouped by party with signed URLs",
    description=(
        "Mediator only. Returns all documents for the case grouped into "
        "requesting_party and against_party lists. Each document includes a "
        "signed GET URL valid for 1 hour for use in the AI analysis split screen."
    )
)
async def list_documents(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    # Verify case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Fetch all documents for this case
    result = supabase.table("documents") \
        .select("*") \
        .eq("case_id", case_id) \
        .order("created_at", desc=True) \
        .execute()

    documents = result.data if result.data else []

    # Fetch case_invitations to know which user_id maps to which party role
    invitations_result = supabase.table("case_invitations") \
        .select("accepted_by, invitation_role") \
        .eq("case_id", case_id) \
        .execute()

    # Build lookup: user_id → "requesting_party" | "against_party"
    role_lookup: dict[str, str] = {}
    if invitations_result.data:
        for inv in invitations_result.data:
            if inv.get("accepted_by") and inv.get("invitation_role"):
                role_lookup[inv["accepted_by"]] = inv["invitation_role"]

    requesting_party_docs = []
    against_party_docs = []

    for doc in documents:
        # Generate signed GET URL — valid for 1 hour
        try:
            signed_response = supabase.storage.from_(BUCKET_NAME).create_signed_url(
                doc["storage_path"],
                SIGNED_GET_URL_EXPIRY
            )
            signed_url = (
                signed_response.get("signedURL")
                or signed_response.get("signed_url")
                or ""
            )
        except Exception:
            # If one file fails, return empty string so the rest still load
            signed_url = ""

        doc_with_url = DocumentWithSignedUrl(
            id=doc["id"],
            case_id=doc["case_id"],
            uploaded_by=doc["uploaded_by"],
            file_name=doc["file_name"],
            file_size=doc["file_size"],
            file_type=doc["file_type"],
            storage_path=doc["storage_path"],
            signed_url=signed_url,
            created_at=doc["created_at"]
        )

        # Group by party role using invitation lookup
        # Default to requesting_party if lookup has no entry
        party_role = role_lookup.get(doc["uploaded_by"], "requesting_party")
        if party_role == "against_party":
            against_party_docs.append(doc_with_url)
        else:
            requesting_party_docs.append(doc_with_url)

    return DocumentsByPartyResponse(
        requesting_party=requesting_party_docs,
        against_party=against_party_docs,
        total=len(documents)
    )


# ─────────────────────────────────────────────
# POST /api/v1/cases/{case_id}/analysis/retry-full
# Mediator only — clears failed results, transitions state, reruns Burst 1
# ─────────────────────────────────────────────
@router.post(
    "/{case_id}/analysis/retry-full",
    status_code=status.HTTP_200_OK,
    summary="Retry full Burst 1 AI pipeline",
    description=(
        "Mediator only. Clears the failed ai_analysis record for this case, "
        "transitions case state to BURST_1_PROCESSING, and re-queues the "
        "full Burst 1 Celery pipeline."
    )
)
async def retry_burst_1(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    # Verify case exists
    case_result = supabase.table("cases").select("id, status").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    case_status = case_result.data[0]["status"]

    # Only allow retry when case is in PROCESSING_FAILED state
    if case_status != "PROCESSING_FAILED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Retry not allowed. Case is in state '{case_status}'. "
                   f"Retry is only available when state is PROCESSING_FAILED."
        )

    # Clear the failed ai_analysis record — reset all sub-system columns
    # We update rather than delete to preserve the audit trail
    try:
        supabase.table("ai_analysis") \
            .update({
                "failed": False,
                "started_at": None,
                "completed_at": None,
                "conflict_extraction": None,
                "neutral_summary": None,
                "bias_removal": None,
                "tone_analysis": None,
                "mediatability": None,
            }) \
            .eq("case_id", case_id) \
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear previous analysis: {str(e)}"
        )

    # Transition case state to BURST_1_PROCESSING
    # Confirm with Moulik (Backend 1) that PROCESSING_FAILED → BURST_1_PROCESSING
    # is a valid transition in state_machine.py before testing this endpoint
    try:
        from app.core.state_machine import transition, CaseState
        transition(case_id, CaseState.BURST_1_PROCESSING, actor_id=current_user["user_id"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transition case state: {str(e)}"
        )

    # Re-queue the Burst 1 Celery task
    try:
        from app.celery.tasks import process_burst_1
        process_burst_1.delay(case_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue pipeline task: {str(e)}"
        )

    return {"status": "retrying", "case_id": case_id}