from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CreateCaseRequest(BaseModel):
    title: str
    description: str
    monetary_amount: Optional[float] = None


class CaseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    created_by: str
    negotiation_round: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int