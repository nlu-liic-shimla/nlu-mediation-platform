from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# ✅ Proper models banaye — dict ki jagah
class CaseCreate(BaseModel):
    title: str
    description: str

class SubmissionCreate(BaseModel):
    statement: str
    desired_outcome: str

# ─────────────────────────────────────────
# CASES ROUTES
# ─────────────────────────────────────────

# POST /api/v1/cases
@router.post("/cases")
def create_case(data: CaseCreate, user=Depends(get_current_user)):
    if user["role"] != "mediator":
        raise HTTPException(status_code=403, detail="Only mediator can create")
    
    response = supabase.table("cases").insert({
        "title": data.title,
        "description": data.description,
        "created_by": user["id"]
    }).execute()
    
    return {
        "message": "Case created",
        "data": response.data
    }

# GET /api/v1/cases
@router.get("/cases")
def get_cases(user=Depends(get_current_user)):
    if user["role"] == "mediator":
        response = supabase.table("cases").select("*").execute()
    else:
        response = supabase.table("cases").select("*").eq("created_by", user["id"]).execute()
    
    return response.data

# GET /api/v1/cases/{case_id}
@router.get("/cases/{case_id}")
def get_case(case_id: str, user=Depends(get_current_user)):  # ✅ int → str
    response = supabase.table("cases").select("*").eq("id", case_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return response.data

# ─────────────────────────────────────────
# SUBMISSIONS ROUTES
# ─────────────────────────────────────────

# GET /api/v1/cases/{case_id}/submissions
@router.get("/cases/{case_id}/submissions")
def get_submissions(case_id: str, user=Depends(get_current_user)):
    # ✅ Abhi stub hai — empty list return karo
    return []

# POST /api/v1/cases/{case_id}/submissions
@router.post("/cases/{case_id}/submissions")
def create_submission(
    case_id: str,
    submission: SubmissionCreate,
    user=Depends(get_current_user)
):
    try:
        response = supabase.table("submissions").insert({
            "case_id": case_id,
            "party_id": user["id"],
            "statement": submission.statement,
            "desired_outcome": submission.desired_outcome
        }).execute()

        return {
            "message": "Submission saved",
            "data": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))