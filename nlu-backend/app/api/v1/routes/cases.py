from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase

router = APIRouter(prefix="/cases", tags=["Cases"])

class CreateCaseRequest(BaseModel):
    title: str
    description: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role(["mediator"]))])
async def create_case(
    request: CreateCaseRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    result = supabase.table("cases").insert({
        "title": request.title,
        "description": request.description,
        "status": "INTAKE_PENDING",
        "created_by": current_user["user_id"],
        "negotiation_round": 0
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create case")

    return result.data[0]

@router.get("/")
async def get_cases(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]
    
    # Mediators see all cases; parties see only their cases
    if role == "mediator":
        result = supabase.table("cases").select("*").execute()
    else:
        result = supabase.table("cases").select("*").eq("created_by", user_id).execute()
    
    return result.data or []

@router.get("/{case_id}")
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("cases").select("*").eq("id", case_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = result.data[0]
    
    # Parties can only access their own cases — return 403, never 404 (security rule)
    if current_user["role"] != "mediator" and case["created_by"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return case