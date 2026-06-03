"""
Document Routes — Backend Role 2
NLU Mediation Platform | Week 2

Endpoints:
    POST /api/v1/cases/{case_id}/documents/upload-url  — get signed URL for upload
    POST /api/v1/cases/{case_id}/documents/confirm     — confirm upload, save metadata
    GET  /api/v1/cases/{case_id}/documents             — list documents for a case
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.models.documents import (
    UploadUrlRequest, UploadUrlResponse,
    DocumentConfirmRequest, DocumentResponse, DocumentListResponse
)
import uuid

router = APIRouter(prefix="/cases", tags=["Documents"])

BUCKET_NAME = "case-documents"
SIGNED_URL_EXPIRY = 600  # 10 minutes in seconds

# Max file sizes in bytes
MAX_FILE_SIZES = {
    "application/pdf": 20 * 1024 * 1024,       # 20MB
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 10 * 1024 * 1024,  # 10MB
    "image/jpeg": 5 * 1024 * 1024,             # 5MB
    "image/png": 5 * 1024 * 1024,              # 5MB
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
# Mediator sees all | Party sees own uploads only
# ─────────────────────────────────────────────
@router.get(
    "/{case_id}/documents",
    response_model=DocumentListResponse,
    summary="List documents for a case",
    description="Mediator sees all documents. Party sees only their own uploads."
)
async def list_documents(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        # Mediator sees all documents for this case
        result = supabase.table("documents") \
            .select("*") \
            .eq("case_id", case_id) \
            .order("created_at", desc=True) \
            .execute()
    else:
        # Party sees only their own uploads
        result = supabase.table("documents") \
            .select("*") \
            .eq("case_id", case_id) \
            .eq("uploaded_by", user_id) \
            .order("created_at", desc=True) \
            .execute()

    documents = [DocumentResponse(**row) for row in result.data] if result.data else []
    return DocumentListResponse(documents=documents, total=len(documents))