# app/models/auth.py
# Updated: Week 3 - all registration fields per Version 5.0 flow doc

from pydantic import BaseModel, EmailStr, validator
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    party_user = "party_user"   # replaces requesting_party + against_party
    mediator = "mediator"       # unchanged


class RegisterRequest(BaseModel):
    """
    Registration fields per hpnlu_final_flow.docx:

    Mediator:   email, password (min 8), role, phone_number (required), organization (required)
    Party User: email, password, role, phone_number (optional), full_name (optional)
    """
    email: EmailStr
    password: str
    role: UserRole
    full_name: Optional[str] = None
    phone_number: Optional[str] = None      # required for mediator, optional for party
    organization: Optional[str] = None      # mediator only

    @validator("password")
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @validator("phone_number", always=True)
    def phone_required_for_mediator(cls, v, values):
        if values.get("role") == UserRole.mediator and not v:
            raise ValueError("phone_number is required for mediator registration")
        return v

    @validator("organization", always=True)
    def organization_required_for_mediator(cls, v, values):
        if values.get("role") == UserRole.mediator and not v:
            raise ValueError("organization is required for mediator registration")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    organization: Optional[str] = None