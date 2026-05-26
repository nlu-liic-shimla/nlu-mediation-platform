from fastapi import APIRouter, HTTPException, status, Depends
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.models.cases import CreateCaseRequest, CaseResponse, CaseListResponse

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CreateCaseRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    new_case = {
        "title": request.title,
        "description": request.description,
        "status": "pending",
        "created_by": current_user["user_id"],
        "negotiation_round": 0,
    }
    result = supabase.table("cases").insert(new_case).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create case"
        )
    return CaseResponse(**result.data[0])


@router.get("", response_model=CaseListResponse)
async def list_cases(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("cases").select("*").order("created_at", desc=True).execute()
    else:
        submissions_result = supabase.table("submissions") \
            .select("case_id").eq("party_id", user_id).execute()
        if not submissions_result.data:
            return CaseListResponse(cases=[], total=0)
        case_ids = list({row["case_id"] for row in submissions_result.data})
        result = supabase.table("cases").select("*").in_("id", case_ids) \
            .order("created_at", desc=True).execute()

    cases = [CaseResponse(**row) for row in result.data] if result.data else []
    return CaseListResponse(cases=cases, total=len(cases))


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]

    result = supabase.table("cases").select("*").eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = result.data[0]

    if role in ["requesting_party", "against_party"]:
        check = supabase.table("submissions").select("id") \
            .eq("case_id", case_id).eq("party_id", user_id).execute()
        if not check.data:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You do not have access to this case")

    return CaseResponse(**case)


@router.get("/{case_id}/submissions")
async def list_submissions(case_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return {"case_id": case_id, "submissions": [], "note": "Stub — full implementation Week 2"}


@router.post("/{case_id}/submissions", status_code=status.HTTP_201_CREATED)
async def create_submission(
    case_id: str,
    current_user: dict = Depends(require_role(["requesting_party", "against_party"]))
):
    result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return {"case_id": case_id, "party_id": current_user["user_id"],
            "note": "Stub — full implementation Week 2"}