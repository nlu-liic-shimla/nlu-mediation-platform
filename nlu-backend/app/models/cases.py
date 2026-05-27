from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class CaseStatus(str, Enum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"


class CreateCaseRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Landlord-Tenant Deposit Dispute",
                "description": "Dispute over return of security deposit."
            }
        }
    }


class CaseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    created_by: str
    negotiation_round: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int