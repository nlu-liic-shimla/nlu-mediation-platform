# app/api/v1/routes/auth.py
# Updated: Week 3 - saves all registration fields, sets verification_status

from fastapi import APIRouter, HTTPException, status, Depends
from app.models.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import supabase
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user.
    Mediator: phone_number and organization are required.
    Party User: phone_number optional, full_name optional.
    verification_status = "approved" by default for MVP.
    """
    # Check if email already exists
    existing = supabase.table("users").select("id").eq(
        "email", request.email
    ).execute()

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    hashed = hash_password(request.password)

    # Build user record — save ALL fields from request
    user_data = {
        "email": request.email,
        "password_hash": hashed,
        "role": request.role.value,
        "full_name": request.full_name,
        "phone_number": request.phone_number,
        "organization": request.organization,
        # verification_status only applies to mediators
        # MVP default = approved (admin workflow is Version 2)
        "verification_status": "approved" if request.role.value == "mediator" else None,
    }

    result = supabase.table("users").insert(user_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

    return {
        "message": "User created successfully",
        "email": request.email,
        "role": request.role.value
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with email and password.
    Returns JWT token containing user_id, role, and email.
    """
    result = supabase.table("users").select("*").eq(
        "email", request.email
    ).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user = result.data[0]

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(data={
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"]
    })

    return TokenResponse(access_token=token)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Returns current user info from JWT."""
    return current_user