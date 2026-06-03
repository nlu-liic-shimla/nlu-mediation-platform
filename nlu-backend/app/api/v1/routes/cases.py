from fastapi import APIRouter, HTTPException, status, Depends, Form
from typing import Optional
import logging
from datetime import datetime
from app.core.dependencies import get_current_user, require_role
from app.core.database import supabase
from app.models.cases import CreateCaseRequest, CaseResponse, CaseListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CreateCaseRequest,
    current_user: dict = Depends(require_role(["mediator"]))
):
    new_case = {
        "title": request.title,
        "description": request.description,
        "status": "INVITED",
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
        result = supabase.table("cases").select("*").order(
            "created_at", desc=True
        ).execute()
    else:
        submissions_result = supabase.table("submissions").select(
            "case_id"
        ).eq("party_id", user_id).execute()

        if not submissions_result.data:
            return CaseListResponse(cases=[], total=0)

        case_ids = list({row["case_id"] for row in submissions_result.data})
        result = supabase.table("cases").select("*").in_(
            "id", case_ids
        ).order("created_at", desc=True).execute()

    cases = [CaseResponse(**row) for row in result.data] if result.data else []
    return CaseListResponse(cases=cases, total=len(cases))


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    user_id = current_user["user_id"]

    result = supabase.table("cases").select("*").eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    case = result.data[0]

    if role in ["requesting_party", "against_party"]:
        check = supabase.table("submissions").select("id").eq(
            "case_id", case_id
        ).eq("party_id", user_id).execute()
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this case"
            )

    return CaseResponse(**case)


@router.get("/{case_id}/submissions")
async def list_submissions(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Check case exists
    case_result = supabase.table("cases").select("id").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    role = current_user["role"]
    user_id = current_user["user_id"]

    if role == "mediator":
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, submitted_at"
        ).eq("case_id", case_id).execute()
    else:
        result = supabase.table("submissions").select(
            "id, party_id, relationship_type, submitted_at"
        ).eq("case_id", case_id).eq("party_id", user_id).execute()

    return {"submissions": result.data if result.data else []}


@router.post("/{case_id}/submissions", status_code=status.HTTP_201_CREATED)
async def create_submission(
    case_id: str,
    statement: str = Form(..., min_length=50),
    desired_outcome: str = Form(...),
    timeline: str = Form(...),
    relationship_type: str = Form(...),
    prior_negotiation: str = Form(...),
    monetary_amount: Optional[float] = Form(None),
    current_user: dict = Depends(require_role(["requesting_party", "against_party"]))
):
    user_id = current_user["user_id"]

    # Validate relationship_type
    valid_types = [
        "landlord_tenant", "employer_employee",
        "commercial", "family", "other"
    ]
    if relationship_type not in valid_types:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "code": "VALIDATION_ERROR",
                "message": f"relationship_type must be one of: {valid_types}"
            }
        )

    # Check case exists
    case_result = supabase.table("cases").select(
        "id, status"
    ).eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    # Check duplicate submission
    existing = supabase.table("submissions").select("id").eq(
        "case_id", case_id
    ).eq("party_id", user_id).execute()
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail={
                "error": True,
                "code": "SUBMISSION_ALREADY_EXISTS",
                "message": "You have already submitted for this case"
            }
        )

    # Convert prior_negotiation string to boolean
    prior_neg_bool = prior_negotiation.lower() == "true"

    # Save submission
    now = datetime.utcnow().isoformat()
    insert_result = supabase.table("submissions").insert({
        "case_id": case_id,
        "party_id": user_id,
        "statement": statement,
        "desired_outcome": desired_outcome,
        "monetary_amount": monetary_amount,
        "timeline": timeline,
        "relationship_type": relationship_type,
        "prior_negotiation": prior_neg_bool,
        "submitted_at": now
    }).execute()

    submission_id = insert_result.data[0]["id"]

    # Count total submissions for this case
    all_subs = supabase.table("submissions").select(
        "party_id"
    ).eq("case_id", case_id).execute()
    submission_count = len(all_subs.data)

    # Trigger state transition
    from app.core.state_machine import transition, CaseState
    if submission_count == 1:
        transition(case_id, CaseState.PARTY_A_SUBMITTED, actor_id=user_id)
    elif submission_count >= 2:
        transition(case_id, CaseState.BOTH_SUBMITTED, actor_id=user_id)
        try:
            from tasks import process_burst_1
            process_burst_1.delay(case_id)
        except Exception as e:
            logger.error(f"Failed to trigger Celery task: {e}")

    return {
        "id": submission_id,
        "case_id": case_id,
        "submitted_at": now
    }


@router.get("/{case_id}/analysis/status")
async def get_analysis_status(
    case_id: str,
    current_user: dict = Depends(require_role(["mediator"]))
):
    # Check case exists
    case_result = supabase.table("cases").select(
        "status"
    ).eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "code": "CASE_NOT_FOUND"}
        )

    # Check ai_analysis table
    try:
        analysis = supabase.table("ai_analysis").select(
            "completed_at, failed, started_at"
        ).eq("case_id", case_id).order(
            "created_at", desc=True
        ).limit(1).execute()
    except Exception:
        return {
            "status": "pending",
            "started_at": None,
            "completed_at": None
        }

    if not analysis.data:
        return {
            "status": "pending",
            "started_at": None,
            "completed_at": None
        }

    record = analysis.data[0]

    if record.get("failed"):
        return {
            "status": "failed",
            "started_at": record.get("started_at"),
            "completed_at": None
        }
    elif record.get("completed_at"):
        return {
            "status": "complete",
            "started_at": record.get("started_at"),
            "completed_at": record["completed_at"]
        }
    else:
        return {
            "status": "processing",
            "started_at": record.get("started_at"),
            "completed_at": None
        }