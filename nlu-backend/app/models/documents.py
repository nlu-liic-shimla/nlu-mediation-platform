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