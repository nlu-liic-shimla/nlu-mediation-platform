# app/models/cases.py
# Updated: Week 3 Day 1 - aligned with Version 5.0 final flow

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Request Models ─────────────────────────────────────────────────────────────

class CreateCaseRequest(BaseModel):
    """
    Used by mediator for Path 2 (direct case creation).
    All party fields are optional — mediator may not have them yet.
    """
    dispute_type: str                              # e.g. "landlord_tenant", "employment"
    brief_description: str                         # min 20, max 500 chars
    requesting_party_email: Optional[str] = None
    against_party_email: Optional[str] = None
    monetary_value: Optional[float] = None


class UpdateCaseNotesRequest(BaseModel):
    """Mediator private notes — never shown to parties."""
    notes: str


class FlagClaimRequest(BaseModel):
    """Mediator flags an AI claim they disagree with."""
    claim_text: str
    reason: Optional[str] = None


# ── Response Models ────────────────────────────────────────────────────────────

class CaseResponse(BaseModel):
    """
    Full case object returned by GET /cases and GET /cases/{id}.
    Includes new Version 5.0 fields.
    """
    id: str
    dispute_type: Optional[str] = None
    brief_description: Optional[str] = None
    status: str
      
    created_by: Optional[str] = None                # ← now optional                              # always mediator user_id
    assigned_mediator: Optional[str] = None        # always mediator user_id
    requesting_party_email: Optional[str] = None
    against_party_email: Optional[str] = None
    negotiation_round: Optional[int] = 0
    monetary_value: Optional[float] = None
    max_rounds: Optional[int] = 3
    mediator_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Attached by GET /cases for party_user — not stored in DB
    your_role_in_this_case: Optional[str] = None   # "requesting_party" or "against_party"

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int


class AnalysisStatusResponse(BaseModel):
    """Returned by GET /cases/{id}/analysis/status"""
    status: str                                    # pending | processing | complete | failed
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class FlagClaimRequest(BaseModel):
    claim_text: str
    reason: Optional[str] = None  # ← must be Optional