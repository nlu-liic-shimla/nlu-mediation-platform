# tasks.py
# Location: nlu-backend/tasks.py  (root level -- do NOT move this file)
# Updated: Week 4 -- all tasks registered with explicit names

import os
import sys
import ssl
import logging
import datetime
from datetime import datetime as dt, timezone

# ── Path setup ────────────────────────────────────────────────────────────────
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

_backend_root = os.path.dirname(os.path.abspath(__file__))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

# ── Environment ───────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

# ── Celery app ────────────────────────────────────────────────────────────────
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL")
if not REDIS_URL:
    raise EnvironmentError("REDIS_URL is not set in .env")

celery_app = Celery(
    "nlu_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
    broker_pool_limit=1,
    redis_max_connections=5,
    broker_connection_retry_on_startup=True,
    worker_pool="solo",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    result_expires=3600,
    task_time_limit=360,
    task_soft_time_limit=300,
    task_acks_late=True,
    worker_cancel_long_running_tasks_on_connection_loss=True,
)

logger = logging.getLogger(__name__)


def get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )


# ══════════════════════════════════════════════════════════════════════════════
# TASK 1 — Hello (smoke test)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="tasks.hello")
def hello():
    logger.info("Hello from Celery!")
    return {"status": "ok", "message": "Hello from Celery!"}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 2 — Process submission received
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="tasks.process_submission_received")
def process_submission_received(case_id: str):
    """
    Triggered when a submission is received.
    Checks if both parties have submitted -- if so, fires process_burst_1.
    """
    supabase = get_supabase()
    submissions = supabase.table("submissions").select(
        "party_id"
    ).eq("case_id", case_id).execute()

    count = len(submissions.data) if submissions.data else 0
    logger.info(f"[Submission] Case {case_id} has {count}/2 submissions")

    if count >= 2:
        logger.info(f"[Submission] Both submitted for case {case_id} -- queuing Burst 1")
        process_burst_1.delay(case_id)

    return {"status": "ok", "case_id": case_id, "submission_count": count}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 3 — Burst 1 AI Pipeline
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    bind=True,
    name="tasks.process_burst_1",
    max_retries=0,
    time_limit=360,
    soft_time_limit=300,
)
def process_burst_1(self, case_id: str):
    """
    Full Burst 1 AI pipeline.
    Triggered automatically when both parties submit their statements.

    Pipeline steps:
        1. F  -- tone analysis on raw statements (mediator only)
        2. A  -- conflict extraction on raw statements
        3. B  -- neutral summary from conflict extraction JSON
        4. E  -- bias removal on neutral summary
        5. G  -- mediatability score from conflict extraction JSON

    On success: case transitions to BURST_1_COMPLETE
    On any failure: case transitions to PROCESSING_FAILED
    """
    supabase = get_supabase()
    now = dt.now(timezone.utc).isoformat()
    logger.info(f"[Burst 1] Starting for case {case_id}")

    from app.core.state_machine import transition, CaseState

    try:
        # ── Idempotency guard ─────────────────────────────────────────────────
        current = supabase.table("cases").select(
            "status"
        ).eq("id", case_id).single().execute()
        current_status = current.data.get("status") if current.data else None

        if current_status == CaseState.BURST_1_PROCESSING:
            logger.warning(f"[Burst 1] Case {case_id} already processing -- skipping duplicate")
            return {"status": "skipped", "case_id": case_id, "reason": "already processing"}

        if current_status != CaseState.BOTH_SUBMITTED:
            logger.warning(f"[Burst 1] Unexpected status '{current_status}' for case {case_id} -- skipping")
            return {"status": "skipped", "case_id": case_id, "reason": f"unexpected status: {current_status}"}

        # ── Transition to BURST_1_PROCESSING ──────────────────────────────────
        transition(case_id, CaseState.BURST_1_PROCESSING, actor_id="system")

        # ── Create tracking record ─────────────────────────────────────────────
        supabase.table("ai_analysis").insert({
            "case_id": case_id,
            "burst_number": 1,
            "status": "processing",
            "started_at": now,
            "failed": False,
        }).execute()

        # ── Fetch both party submissions ───────────────────────────────────────
        submissions = supabase.table("submissions").select(
            "party_id, statement"
        ).eq("case_id", case_id).execute()

        if not submissions.data or len(submissions.data) < 2:
            raise ValueError(
                f"Expected 2 submissions for case {case_id}, "
                f"got {len(submissions.data) if submissions.data else 0}"
            )

        # ── Map submissions to roles ───────────────────────────────────────────
        statement_a = None
        statement_b = None

        for sub in submissions.data:
            party_id = sub["party_id"]
            inv = supabase.table("case_invitations").select(
                "invitation_role"
            ).eq("case_id", case_id).eq("accepted_by", party_id).execute()

            if inv.data:
                role = inv.data[0]["invitation_role"]
                if role == "requesting_party":
                    statement_a = sub["statement"]
                elif role == "against_party":
                    statement_b = sub["statement"]

        if not statement_a or not statement_b:
            raise ValueError(
                f"Could not map submissions to roles for case {case_id}. "
                f"statement_a={'found' if statement_a else 'missing'}, "
                f"statement_b={'found' if statement_b else 'missing'}"
            )

        logger.info(f"[Burst 1] Submissions loaded for case {case_id}")

        # ── Import AI subsystems ───────────────────────────────────────────────
        from ai.subsystems.subsystem_f import analyse_tone
        from ai.subsystems.subsystem_a import extract_conflict
        from ai.subsystems.subsystem_b import generate_neutral_summary
        from ai.subsystems.subsystem_e import remove_bias
        from ai.subsystems.subsystem_g import calculate_mediatability
        from ai.utils.ai_client import is_failed

        # ── Step 1: Tone Analysis (F) ──────────────────────────────────────────
        logger.info(f"[Burst 1] Step 1 -- Tone analysis (F) for case {case_id}")
        tone_result = analyse_tone(statement_a, statement_b)

        if is_failed(tone_result):
            logger.warning(f"[Burst 1] Sub-system F failed: {tone_result.get('reason', 'unknown')}")
            tone_data = None
        else:
            tone_data = tone_result.model_dump()
            logger.info(f"[Burst 1] Step 1 complete")

        supabase.table("ai_analysis").update({
            "tone_analysis": tone_data,
        }).eq("case_id", case_id).execute()

        # ── Step 2: Conflict Extraction (A) ───────────────────────────────────
        logger.info(f"[Burst 1] Step 2 -- Conflict extraction (A) for case {case_id}")
        conflict_result = extract_conflict(statement_a, statement_b)

        if is_failed(conflict_result):
            raise ValueError(
                f"Sub-system A failed after retries: "
                f"{conflict_result.get('reason', 'unknown')}"
            )

        logger.info(
            f"[Burst 1] Step 2 complete -- "
            f"dispute_type={conflict_result.dispute_type}, "
            f"confidence={conflict_result.extraction_confidence}"
        )

        supabase.table("ai_analysis").update({
            "conflict_extraction": conflict_result.model_dump(),
        }).eq("case_id", case_id).execute()

        if conflict_result.extraction_confidence < 0.5:
            logger.warning(
                f"[Burst 1] Low extraction confidence "
                f"({conflict_result.extraction_confidence}) for case {case_id}"
            )

        # ── Step 3: Neutral Summary (B) ───────────────────────────────────────
        logger.info(f"[Burst 1] Step 3 -- Neutral summary (B) for case {case_id}")
        summary_result = generate_neutral_summary(conflict_result)

        if is_failed(summary_result):
            logger.warning(f"[Burst 1] Sub-system B failed: {summary_result.get('reason', 'unknown')}")
            summary_data = None
            bias_data = None
        else:
            summary_data = summary_result.model_dump()
            logger.info(f"[Burst 1] Step 3 complete")

            # ── Step 4: Bias Removal (E) ──────────────────────────────────────
            logger.info(f"[Burst 1] Step 4 -- Bias removal (E) for case {case_id}")
            bias_result = remove_bias(summary_result)

            if is_failed(bias_result):
                logger.warning(f"[Burst 1] Sub-system E failed: {bias_result.get('reason', 'unknown')}")
                bias_data = None
            else:
                bias_data = bias_result.model_dump()
                logger.info(
                    f"[Burst 1] Step 4 complete -- "
                    f"bias_detected={bias_result.bias_detected}, "
                    f"bias_check_passed={bias_result.bias_check_passed}"
                )

        supabase.table("ai_analysis").update({
            "neutral_summary": summary_data,
            "bias_removal": bias_data,
        }).eq("case_id", case_id).execute()

        # ── Step 5: Mediatability Score (G) ───────────────────────────────────
        logger.info(f"[Burst 1] Step 5 -- Mediatability score (G) for case {case_id}")
        mediatability_result = calculate_mediatability(conflict_result)

        if is_failed(mediatability_result):
            logger.warning(f"[Burst 1] Sub-system G failed for case {case_id}")
            mediatability_data = None
        else:
            mediatability_data = mediatability_result.model_dump()
            logger.info(
                f"[Burst 1] Step 5 complete -- "
                f"score={mediatability_result.mediatability_score}, "
                f"band={mediatability_result.mediatability_band}"
            )

        # ── Mark complete ──────────────────────────────────────────────────────
        completed_at = dt.now(timezone.utc).isoformat()

        supabase.table("ai_analysis").update({
            "mediatability": mediatability_data,
            "status": "complete",
            "completed_at": completed_at,
            "failed": False,
        }).eq("case_id", case_id).execute()

        transition(case_id, CaseState.BURST_1_COMPLETE, actor_id="system")
        logger.info(f"[Burst 1] Pipeline COMPLETE for case {case_id}")

        return {
            "status": "complete",
            "case_id": case_id,
            "completed_at": completed_at,
        }

    except Exception as e:
        logger.error(
            f"[Burst 1] FAILED for case {case_id}: {type(e).__name__}: {e}",
            exc_info=True
        )
        try:
            supabase.table("ai_analysis").update({
                "status": "failed",
                "failed": True,
                "error_message": f"{type(e).__name__}: {str(e)}",
            }).eq("case_id", case_id).execute()
        except Exception as db_err:
            logger.error(f"[Burst 1] Could not update failed status: {db_err}")

        try:
            from app.core.state_machine import transition, CaseState
            transition(case_id, CaseState.PROCESSING_FAILED, actor_id="system")
        except Exception as transition_err:
            logger.error(f"[Burst 1] Could not transition to PROCESSING_FAILED: {transition_err}")

        return {"status": "failed", "case_id": case_id, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 4 — Burst 2 AI Pipeline (BATNA/WATNA)
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    bind=True,
    name="tasks.process_burst_2",
    max_retries=0,
    time_limit=300,
    soft_time_limit=270,
)
def process_burst_2(self, case_id: str):
    """
    Burst 2 AI Pipeline -- BATNA/WATNA Analysis.
    Triggered when both parties complete the questionnaire.

    Saves results to BOTH 'result' and 'batna_watna' columns.
    generate_proposal_revision reads from both -- whichever exists.

    Run this SQL first if you get column error:
        ALTER TABLE ai_analysis ADD COLUMN IF NOT EXISTS batna_watna JSONB;
        UPDATE ai_analysis SET batna_watna = result
        WHERE burst_number = 2 AND result IS NOT NULL AND batna_watna IS NULL;
    """
    supabase = get_supabase()
    logger.info(f"[Burst 2] Starting for case {case_id}")

    from app.core.state_machine import transition, CaseState

    try:
        # ── Step 1: Transition ─────────────────────────────────────────────────
        transition(
            case_id=case_id,
            new_state=CaseState.BURST_2_PROCESSING,
            actor_id="system",
            metadata={"celery_task_id": self.request.id},
        )

        # ── Step 2: Fetch Burst 1 conflict extraction ─────────────────────────
        analysis_resp = supabase.table("ai_analysis").select(
            "conflict_extraction"
        ).eq("case_id", case_id).eq(
            "burst_number", 1
        ).order("created_at", desc=True).limit(1).execute()

        if not analysis_resp.data or not analysis_resp.data[0].get("conflict_extraction"):
            raise ValueError(f"No Burst 1 conflict_extraction found for case {case_id}")

        conflict_extraction_json = analysis_resp.data[0]["conflict_extraction"]

        # ── Step 3: Fetch questionnaire and both responses ────────────────────
        q_resp = supabase.table("questionnaires").select(
            "id"
        ).eq("case_id", case_id).order(
            "created_at", desc=True
        ).limit(1).execute()

        if not q_resp.data:
            raise ValueError(f"No questionnaire found for case {case_id}")

        questionnaire_id = q_resp.data[0]["id"]

        responses_resp = supabase.table("questionnaire_responses").select(
            "respondent_id, answers"
        ).eq("questionnaire_id", questionnaire_id).execute()

        if not responses_resp.data or len(responses_resp.data) < 2:
            raise ValueError(
                f"Expected 2 questionnaire responses, "
                f"found {len(responses_resp.data or [])}"
            )

        # ── Step 4: Match responses to party roles ────────────────────────────
        questionnaire_responses = {
            "requesting_party": None,
            "against_party": None
        }

        for response in responses_resp.data:
            inv = supabase.table("case_invitations").select(
                "invitation_role"
            ).eq("case_id", case_id).eq(
                "accepted_by", response["respondent_id"]
            ).execute()

            if inv.data:
                role = inv.data[0]["invitation_role"]
                if role in questionnaire_responses:
                    questionnaire_responses[role] = response["answers"]

        if not questionnaire_responses["requesting_party"]:
            questionnaire_responses["requesting_party"] = responses_resp.data[0]["answers"]
        if not questionnaire_responses["against_party"]:
            questionnaire_responses["against_party"] = responses_resp.data[1]["answers"]

        logger.info(f"[Burst 2] Questionnaire responses loaded for case {case_id}")

        # ── Step 5: Call Sub-system D ─────────────────────────────────────────
        from ai.subsystems.subsystem_d import generate_batna_watna
        from ai.schemas import ConflictExtraction
        from ai.utils.ai_client import is_failed

        valid_dispute_types = {
            "landlord_tenant", "employment", "commercial_contract",
            "property_boundary", "family_business", "construction",
            "consumer", "debt_recovery", "other"
        }
        dt_val = conflict_extraction_json.get("dispute_type")
        if dt_val not in valid_dispute_types:
            conflict_extraction_json["dispute_type"] = (
                "commercial_contract" if dt_val == "commercial" else "other"
            )

        conflict_obj = ConflictExtraction(**conflict_extraction_json)
        result = generate_batna_watna(conflict_obj, questionnaire_responses)

        if result is None or is_failed(result):
            raise ValueError(
                f"Sub-system D failed: "
                f"{result.get('reason', 'unknown') if isinstance(result, dict) else 'returned None'}"
            )

        if hasattr(result, "model_dump"):
            result_dict = result.model_dump()
        elif hasattr(result, "dict"):
            result_dict = result.dict()
        else:
            result_dict = result

        logger.info(f"[Burst 2] Sub-system D complete for case {case_id}")

        # ── Step 6: Save to ai_analysis ───────────────────────────────────────
        # Save to BOTH columns so generate_proposal_revision can find it
        completed_at = dt.now(timezone.utc).isoformat()

        try:
            supabase.table("ai_analysis").insert({
                "case_id": case_id,
                "burst_number": 2,
                "result": result_dict,
                "batna_watna": result_dict,
                "status": "complete",
                "started_at": completed_at,
                "completed_at": completed_at,
                "failed": False,
            }).execute()
        except Exception as insert_err:
            # batna_watna column may not exist yet -- save without it
            logger.warning(
                f"[Burst 2] Insert with batna_watna failed ({insert_err}), "
                f"retrying without batna_watna column"
            )
            supabase.table("ai_analysis").insert({
                "case_id": case_id,
                "burst_number": 2,
                "result": result_dict,
                "status": "complete",
                "started_at": completed_at,
                "completed_at": completed_at,
                "failed": False,
            }).execute()

        # ── Step 7: Transition to BURST_2_COMPLETE ────────────────────────────
        transition(
            case_id=case_id,
            new_state=CaseState.BURST_2_COMPLETE,
            actor_id="system",
            metadata={"celery_task_id": self.request.id},
        )

        logger.info(f"[Burst 2] COMPLETE for case {case_id}")

        return {
            "status": "complete",
            "case_id": case_id,
            "completed_at": completed_at,
        }

    except Exception as e:
        logger.error(f"[Burst 2] FAILED for case {case_id}: {e}", exc_info=True)

        try:
            supabase.table("ai_analysis").insert({
                "case_id": case_id,
                "burst_number": 2,
                "status": "failed",
                "failed": True,
                "error_message": f"{type(e).__name__}: {str(e)}",
                "started_at": dt.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as db_err:
            logger.error(f"[Burst 2] Could not write failure to DB: {db_err}")

        try:
            from app.core.state_machine import transition, CaseState
            transition(
                case_id=case_id,
                new_state=CaseState.PROCESSING_FAILED,
                actor_id="system",
                metadata={"error": str(e), "celery_task_id": self.request.id},
            )
        except Exception as transition_err:
            logger.error(f"[Burst 2] Could not transition to PROCESSING_FAILED: {transition_err}")

        return {"status": "failed", "case_id": case_id, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# TASK 5 — Background Proposal Structure Extraction
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="tasks.extract_proposal_structure",
    time_limit=120,
)
def extract_proposal_structure(proposal_id: str):
    """
    Extracts structured JSON from a proposal's raw text.
    Triggered after mediator creates or saves a proposal.
    Non-critical -- failure does not block mediator.
    """
    supabase = get_supabase()
    logger.info(f"[ProposalStructure] Starting extraction for proposal {proposal_id}")

    try:
        proposal_resp = supabase.table("proposals").select(
            "raw_text"
        ).eq("id", proposal_id).single().execute()

        if not proposal_resp.data:
            logger.warning(f"[ProposalStructure] Proposal {proposal_id} not found")
            return

        raw_text = proposal_resp.data["raw_text"]

        try:
            from ai.subsystems.proposal_structurer import extract_structure
            structured = extract_structure(raw_text)
        except ImportError:
            logger.warning("[ProposalStructure] proposal_structurer not found -- using placeholder")
            structured = {
                "terms": [],
                "conditions": [],
                "timeline": "",
                "raw_text_length": len(raw_text)
            }

        supabase.table("proposals").update({
            "structured_json": structured,
        }).eq("id", proposal_id).execute()

        logger.info(f"[ProposalStructure] Completed for proposal {proposal_id}")

    except Exception as e:
        logger.error(f"[ProposalStructure] Failed for proposal {proposal_id}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TASK 6 — Sub-system H: Proposal Revision After Rejection
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="tasks.generate_proposal_revision",
    time_limit=300,
)
def generate_proposal_revision(case_id: str, proposal_id: str):
    """
    Runs Sub-system H to generate a revised proposal draft after rejection.
    Triggered when any party rejects and case moves to MEDIATION_IN_PROGRESS.
    Non-critical -- mediator can write revision manually if this fails.

    FIXED:
    - Fetches BATNA/WATNA from both 'batna_watna' and 'result' columns
    - Reconstructs BatnaWatnaOutput Pydantic object before passing to Sub-system H
    - Falls back gracefully if BATNA/WATNA not available
    """
    supabase = get_supabase()
    logger.info(f"[ProposalRevision] Starting for case {case_id}, proposal {proposal_id}")

    try:
        # ── Fetch proposal ────────────────────────────────────────────────────
        proposal_resp = supabase.table("proposals").select(
            "raw_text, round_number"
        ).eq("id", proposal_id).single().execute()

        if not proposal_resp.data:
            raise ValueError(f"Proposal {proposal_id} not found")

        raw_text = proposal_resp.data["raw_text"]
        round_number = proposal_resp.data.get("round_number", 1)

        # ── Fetch rejection reasons ───────────────────────────────────────────
        responses_resp = supabase.table("proposal_responses").select(
            "party_id, decision, rejection_reason"
        ).eq("proposal_id", proposal_id).execute()

        requesting_reason = None
        against_reason = None

        for r in (responses_resp.data or []):
            if r["decision"] != "reject":
                continue
            inv = supabase.table("case_invitations").select(
                "invitation_role"
            ).eq("case_id", case_id).eq(
                "accepted_by", r["party_id"]
            ).single().execute()

            if inv.data:
                role = inv.data["invitation_role"]
                if role == "requesting_party":
                    requesting_reason = r["rejection_reason"]
                elif role == "against_party":
                    against_reason = r["rejection_reason"]

        # ── Fetch BATNA/WATNA ─────────────────────────────────────────────────
        # Try batna_watna column first, fall back to result column
        batna_resp = supabase.table("ai_analysis").select(
            "result, batna_watna"
        ).eq("case_id", case_id).eq(
            "burst_number", 2
        ).order("created_at", desc=True).limit(1).execute()

        batna_watna_dict = None
        if batna_resp.data:
            row = batna_resp.data[0]
            batna_watna_dict = row.get("batna_watna") or row.get("result")

        # ── Reconstruct BatnaWatnaOutput Pydantic object ─────────────────────
        batna_watna_obj = None
        if batna_watna_dict:
            try:
                from ai.schemas import BatnaWatnaOutput
                batna_watna_obj = BatnaWatnaOutput(**batna_watna_dict)
                logger.info(f"[ProposalRevision] BATNA/WATNA loaded successfully")
            except Exception as e:
                logger.warning(f"[ProposalRevision] Could not reconstruct BatnaWatnaOutput: {e}")

        if not batna_watna_obj:
            logger.warning(f"[ProposalRevision] No BATNA/WATNA for case {case_id} -- limited context")

        # ── Fetch mediator notes ──────────────────────────────────────────────
        case_resp = supabase.table("cases").select(
            "mediator_notes"
        ).eq("id", case_id).single().execute()

        mediator_notes = case_resp.data.get("mediator_notes") if case_resp.data else None

        # ── Call Sub-system H ─────────────────────────────────────────────────
        result = None

        if batna_watna_obj:
            try:
                from ai.subsystems.subsystem_h import generate_proposal_revision as run_h
                result = run_h(
                    proposal_raw_text=raw_text,
                    requesting_party_rejection_reason=requesting_reason,
                    against_party_rejection_reason=against_reason,
                    batna_watna=batna_watna_obj,
                    round_number=round_number,
                    mediator_notes=mediator_notes,
                )
                logger.info(f"[ProposalRevision] Sub-system H complete with full context")
            except Exception as e:
                logger.error(f"[ProposalRevision] Sub-system H failed: {e}", exc_info=True)
                result = None

        # ── Final fallback ────────────────────────────────────────────────────
        if not result:
            result = {
                "revised_draft": raw_text,
                "changes_summary": [
                    "AI revision unavailable -- please revise manually",
                    f"Requesting party reason: {requesting_reason or 'N/A'}",
                    f"Against party reason: {against_reason or 'N/A'}"
                ],
                "reasoning": "Automatic revision failed. Rejection reasons shown above for manual revision."
            }

        # ── Save revision suggestions ─────────────────────────────────────────
        supabase.table("proposals").update({
            "revision_suggestions": result,
        }).eq("id", proposal_id).execute()

        # ── Write audit log ───────────────────────────────────────────────────
        supabase.table("audit_logs").insert({
            "case_id": case_id,
            "actor_id": "system",
            "action": "PROPOSAL_REVISION_GENERATED",
            "old_state": "MEDIATION_IN_PROGRESS",
            "new_state": "MEDIATION_IN_PROGRESS",
            "metadata": {
                "proposal_id": proposal_id,
                "has_requesting_reason": requesting_reason is not None,
                "has_against_reason": against_reason is not None,
                "has_batna_watna": batna_watna_obj is not None,
                "round_number": round_number,
            },
            "created_at": dt.utcnow().isoformat(),
        }).execute()

        logger.info(f"[ProposalRevision] Complete for case {case_id}")
        return {"status": "complete", "case_id": case_id, "proposal_id": proposal_id}

    except Exception as e:
        logger.error(f"[ProposalRevision] Failed: {e}", exc_info=True)
        try:
            supabase.table("proposals").update({
                "revision_suggestions": {
                    "error": True,
                    "message": "AI revision failed. Please revise manually.",
                },
            }).eq("id", proposal_id).execute()
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════════════════════
# TASK 7 — Settlement PDF Generation
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="tasks.generate_settlement_pdf_task",
    time_limit=120,
)
def generate_settlement_pdf_task(case_id: str):
    """
    Generates settlement PDF after both parties confirm.
    Saves PDF to Supabase Storage and URL to mediation_reports.
    Non-critical -- confirmations are still saved if this fails.
    """
    logger.info(f"[SettlementPDF] Starting PDF generation for case {case_id}")

    try:
        from app.services.pdf_generator import generate_settlement_pdf
        signed_url = generate_settlement_pdf(case_id)
        logger.info(f"[SettlementPDF] PDF generated successfully for case {case_id}")
        return {"status": "complete", "case_id": case_id, "pdf_url": signed_url}

    except Exception as e:
        logger.error(f"[SettlementPDF] Failed for case {case_id}: {e}", exc_info=True)
        return {"status": "failed", "case_id": case_id, "error": str(e)}