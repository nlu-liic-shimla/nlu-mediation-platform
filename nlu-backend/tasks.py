from celery import shared_task
from ai.pipeline_burst1 import run_burst1_pipeline
import json

@shared_task
def process_burst_1(case_id: str):
    """
    Triggered automatically when both parties submit.
    Fetches submissions, runs Burst 1 pipeline, saves to ai_analysis.
    """
    from app.core.database import supabase
    from app.core.state_machine import transition

    try:
        # 1. Get both submissions
        result = supabase.table("submissions")\
            .select("*")\
            .eq("case_id", case_id)\
            .execute()

        if not result.data or len(result.data) < 2:
            raise Exception("Both submissions not found")

        # Identify party A and party B by invitation role
        party_a_statement = None
        party_b_statement = None

        for sub in result.data:
            # Check case_invitations to determine role
            inv = supabase.table("case_invitations")\
                .select("invitation_role")\
                .eq("case_id", case_id)\
                .eq("accepted_by", sub["party_id"])\
                .execute()

            if inv.data:
                role = inv.data[0]["invitation_role"]
                if role == "requesting_party":
                    party_a_statement = sub["statement"]
                elif role == "against_party":
                    party_b_statement = sub["statement"]

        if not party_a_statement or not party_b_statement:
            raise Exception("Could not identify party statements")

        # 2. Run Burst 1 pipeline
        burst1_result = run_burst1_pipeline(
            party_a_statement=party_a_statement,
            party_b_statement=party_b_statement,
            case_id=case_id
        )

        # 3. Save to ai_analysis table
        supabase.table("ai_analysis").insert({
            "case_id": case_id,
            "burst_number": 1,
            "tone_analysis": burst1_result.tone_analysis.model_dump()
                if burst1_result.tone_analysis else None,
            "bias_removal": burst1_result.bias_removal.model_dump()
                if burst1_result.bias_removal else None,
            "conflict_extraction": burst1_result.conflict_extraction.model_dump()
                if burst1_result.conflict_extraction else None,
            "neutral_summary": burst1_result.neutral_summary.model_dump()
                if burst1_result.neutral_summary else None,
            "mediatability": burst1_result.mediatability.model_dump()
                if burst1_result.mediatability else None,
            "completed_steps": burst1_result.completed_steps,
            "status": "complete",
            "completed_at": "now()"
        }).execute()

        # 4. Transition state
        transition(case_id, "BURST_1_COMPLETE")

    except Exception as e:
        print(f"[ERROR] Burst 1 failed for case {case_id}: {e}")
        transition(case_id, "PROCESSING_FAILED")
        raise