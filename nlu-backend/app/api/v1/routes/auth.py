from fastapi import APIRouter, HTTPException, status
from app.models.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    # Check if user already exists
    existing = supabase.table("users").select("id").eq("email", request.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Hash password and create user
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
    # Find user
    result = supabase.table("users").select("*").eq("email", request.email).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user = result.data[0]
    
    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create JWT token
    token = create_access_token(data={
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"]
    })
    
    return TokenResponse(access_token=token)