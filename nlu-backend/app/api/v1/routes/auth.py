from fastapi import APIRouter, HTTPException, status, Depends
from app.models.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import supabase
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    existing = supabase.table("users").select("id").eq("email", request.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    hashed = hash_password(request.password)
    result = supabase.table("users").insert({
        "email": request.email,
        "password_hash": hashed,
        "role": request.role.value
    }).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    return {"message": "User created successfully", "email": request.email}


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    result = supabase.table("users").select("*").eq("email", request.email).execute()
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
    return current_user