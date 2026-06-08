"""
Document Models — Pydantic schemas for document routes
Backend Role 2 | NLU Mediation Platform | Week 2
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class AllowedFileType(str, Enum):
    PDF = "application/pdf"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    JPEG = "image/jpeg"
    PNG = "image/png"


class UploadUrlRequest(BaseModel):
    file_name: str
    file_type: str
    file_size: int  # in bytes

    model_config = {
        "json_schema_extra": {
            "example": {
                "file_name": "rent_agreement.pdf",
                "file_type": "application/pdf",
                "file_size": 1048576
            }
        }
    }


class UploadUrlResponse(BaseModel):
    signed_url: str
    storage_path: str
    expires_in: int  # seconds


class DocumentConfirmRequest(BaseModel):
    file_name: str
    file_size: int
    file_type: str
    storage_path: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "file_name": "rent_agreement.pdf",
                "file_size": 1048576,
                "file_type": "application/pdf",
                "storage_path": "case-documents/case-123/rent_agreement.pdf"
            }
        }
    }


class DocumentResponse(BaseModel):
    id: str
    case_id: str
    uploaded_by: str
    file_name: str
    file_size: int
    file_type: str
    storage_path: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class DocumentWithSignedUrl(BaseModel):
    """Single document with a short-lived signed GET URL for the mediator split screen."""
    id: str
    case_id: str
    uploaded_by: str          # user_id of the party who uploaded
    file_name: str
    file_size: int
    file_type: str
    storage_path: str
    signed_url: str           # signed GET URL — valid for 60 minutes
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentsByPartyResponse(BaseModel):
    """
    Documents grouped by party role — used by the mediator AI analysis split screen.
    Each list is ordered newest-first.
    """
    requesting_party: list[DocumentWithSignedUrl]
    against_party: list[DocumentWithSignedUrl]
    total: int