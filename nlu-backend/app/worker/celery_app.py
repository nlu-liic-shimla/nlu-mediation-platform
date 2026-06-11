# nlu-backend/app/worker/celery_app.py
# Run from nlu-backend/ directory:
#   celery -A app.worker.celery_app worker --loglevel=info --pool=solo
 
import os
import sys
import ssl
import logging
from datetime import datetime, timezone
 
# ── Path setup — MUST be first, before any other imports ─────────────────────
# File is at: nlu-mediation-platform/nlu-backend/app/worker/celery_app.py
# ai/ is at:  nlu-mediation-platform/ai/
# So we need: nlu-mediation-platform/ on sys.path
 
_this_file    = os.path.abspath(__file__)                  # .../app/worker/celery_app.py
_worker_dir   = os.path.dirname(_this_file)                # .../app/worker/
_app_dir      = os.path.dirname(_worker_dir)               # .../app/
_backend_dir  = os.path.dirname(_app_dir)                  # .../nlu-backend/
_project_root = os.path.dirname(_backend_dir)              # .../nlu-mediation-platform/
 
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)
 
# ── Environment ───────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()
 
# ── Celery ────────────────────────────────────────────────────────────────────
from celery import Celery
 
logger = logging.getLogger(__name__)
 
REDIS_URL = os.environ.get("REDIS_URL")
if not REDIS_URL:
    raise EnvironmentError("REDIS_URL is not set in .env")
 
celery_app = Celery(
    "nlu_mediation",
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
)
 
 
# ── Supabase helper ───────────────────────────────────────────────────────────
def get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )
 
 
# ── Smoke test ────────────────────────────────────────────────────────────────
@celery_app.task(name="tasks.hello", bind=True)
def hello(self):
    logger.info("Hello from Celery!")
    return {"status": "ok", "message": "Hello from Celery!"}
 
 
# ── Submission received stub ──────────────────────────────────────────────────
@celery_app.task(name="tasks.process_submission_received", bind=True)
def process_submission_received(self, case_id: str):
    logger.info(f"[STUB] process_submission_received for case_id={case_id}")
    return {"status": "stub", "case_id": case_id}
 
 
# ── Burst 1 pipeline ──────────────────────────────────────────────────────────
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
    Triggered when both parties submit their statements.
 
    Valid state path:
        BOTH_SUBMITTED → BURST_1_PROCESSING → BURST_1_COMPLETE
        BOTH_SUBMITTED → BURST_1_PROCESSING → PROCESSING_FAILED
 
    NOTE: Cannot go BOTH_SUBMITTED → PROCESSING_FAILED directly.
    Must always pass through BURST_1_PROCESSING first.
    """
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
 
    # Verify ai/ is importable before doing anything
    ai_path = os.path.join(_project_root, "ai")
    if not os.path.isdir(ai_path):
        logger.error(f"[Burst 1] ai/ folder not found at {ai_path}. sys.path={sys.path}")
        return {"status": "failed", "case_id": case_id, "error": f"ai/ not found at {ai_path}"}
 
    logger.info(f"[Burst 1] Starting for case {case_id} — ai/ found at {ai_path}")
 
    from app.core.state_machine import transition, CaseState
 
    # ── Transition to BURST_1_PROCESSING immediately ──────────────────────────
    # Must do this before any work so PROCESSING_FAILED is reachable on error.
    # State machine: BOTH_SUBMITTED → BURST_1_PROCESSING → PROCESSING_FAILED
    try:
        transition(case_id, CaseState.BURST_1_PROCESSING, actor_id="system")
    except Exception as e:
        logger.error(f"[Burst 1] Could not transition to BURST_1_PROCESSING: {e}")
        return {"status": "failed", "case_id": case_id, "error": str(e)}
 
    try:
        # ── Create tracking record ────────────────────────────────────────────
        supabase.table("ai_analysis").insert({
            "case_id": case_id,
            "burst_number": 1,
            "status": "processing",
            "started_at": now,
            "failed": False,
        }).execute()
 
        # ── Fetch submissions ─────────────────────────────────────────────────
        submissions = supabase.table("submissions").select(
            "party_id, statement"
        ).eq("case_id", case_id).execute()
 
        if not submissions.data or len(submissions.data) < 2:
            raise ValueError(
                f"Expected 2 submissions for case {case_id}, "
                f"got {len(submissions.data) if submissions.data else 0}"
            )
 
        # ── Map submissions to roles ──────────────────────────────────────────
        statement_a = None
        statement_b = None
 
        for sub in submissions.data:
            inv = supabase.table("case_invitations").select(
                "invitation_role"
            ).eq("case_id", case_id).eq("accepted_by", sub["party_id"]).execute()
 
            if inv.data:
                role = inv.data[0]["invitation_role"]
                if role == "requesting_party":
                    statement_a = sub["statement"]
                elif role == "against_party":
                    statement_b = sub["statement"]
 
        if not statement_a or not statement_b:
            raise ValueError(
                f"Could not map submissions to roles — "
                f"statement_a={'found' if statement_a else 'MISSING'}, "
                f"statement_b={'found' if statement_b else 'MISSING'}"
            )
 
        logger.info(f"[Burst 1] Submissions loaded for case {case_id}")
 
        # ── Import AI subsystems ──────────────────────────────────────────────
        from ai.subsystems.subsystem_f import analyse_tone
        from ai.subsystems.subsystem_a import extract_conflict
        from ai.subsystems.subsystem_b import generate_neutral_summary
        from ai.subsystems.subsystem_e import remove_bias
        from ai.subsystems.subsystem_g import calculate_mediatability
        from ai.utils.ai_client import is_failed
 
        # ── Step 1: Tone Analysis (F) — non-critical ──────────────────────────
        logger.info(f"[Burst 1] Step 1 — Tone analysis")
        tone_result = analyse_tone(statement_a, statement_b)
        tone_data = None
        if is_failed(tone_result):
            logger.warning(f"[Burst 1] F failed — continuing without tone data")
        else:
            tone_data = tone_result.model_dump()
            logger.info(f"[Burst 1] Step 1 complete")
 
        supabase.table("ai_analysis").update({
            "tone_analysis": tone_data,
        }).eq("case_id", case_id).execute()
 
        # ── Step 2: Conflict Extraction (A) — CRITICAL ────────────────────────
        logger.info(f"[Burst 1] Step 2 — Conflict extraction")
        conflict_result = extract_conflict(statement_a, statement_b)
 
        if is_failed(conflict_result):
            raise ValueError(
                f"Sub-system A failed: {conflict_result.get('reason', 'unknown')}"
            )
 
        logger.info(
            f"[Burst 1] Step 2 complete — "
            f"type={conflict_result.dispute_type.value} "
            f"conf={conflict_result.extraction_confidence}"
        )
 
        supabase.table("ai_analysis").update({
            "conflict_extraction": conflict_result.model_dump(),
        }).eq("case_id", case_id).execute()
 
        # ── Step 3: Neutral Summary (B) — non-critical ────────────────────────
        logger.info(f"[Burst 1] Step 3 — Neutral summary")
        summary_result = generate_neutral_summary(conflict_result)
        summary_data = None
        bias_data = None
 
        if is_failed(summary_result):
            logger.warning(f"[Burst 1] B failed — skipping E")
        else:
            summary_data = summary_result.model_dump()
            logger.info(f"[Burst 1] Step 3 complete")
 
            # ── Step 4: Bias Removal (E) — non-critical ───────────────────────
            logger.info(f"[Burst 1] Step 4 — Bias removal")
            bias_result = remove_bias(summary_result)
            if is_failed(bias_result):
                logger.warning(f"[Burst 1] E failed — summary shown without bias check")
            else:
                bias_data = bias_result.model_dump()
                logger.info(
                    f"[Burst 1] Step 4 complete — "
                    f"bias_detected={bias_result.bias_detected}"
                )
 
        supabase.table("ai_analysis").update({
            "neutral_summary": summary_data,
            "bias_removal":    bias_data,
        }).eq("case_id", case_id).execute()
 
        # ── Step 5: Mediatability Score (G) — non-critical ───────────────────
        logger.info(f"[Burst 1] Step 5 — Mediatability score")
        mediatability_result = calculate_mediatability(conflict_result)
        mediatability_data = None
 
        if is_failed(mediatability_result):
            logger.warning(f"[Burst 1] G failed")
        else:
            mediatability_data = mediatability_result.model_dump()
            logger.info(
                f"[Burst 1] Step 5 complete — "
                f"score={mediatability_result.mediatability_score} "
                f"band={mediatability_result.mediatability_band.value}"
            )
 
        # ── Mark complete ─────────────────────────────────────────────────────
        completed_at = datetime.now(timezone.utc).isoformat()
 
        supabase.table("ai_analysis").update({
            "mediatability": mediatability_data,
            "status":        "complete",
            "completed_at":  completed_at,
            "failed":        False,
        }).eq("case_id", case_id).execute()
 
        # BURST_1_PROCESSING → BURST_1_COMPLETE
        transition(case_id, CaseState.BURST_1_COMPLETE, actor_id="system")
 
        logger.info(f"[Burst 1] COMPLETE for case {case_id}")
        return {"status": "complete", "case_id": case_id, "completed_at": completed_at}
 
    except Exception as e:
        logger.error(
            f"[Burst 1] FAILED for case {case_id}: {type(e).__name__}: {e}",
            exc_info=True
        )
 
        try:
            supabase.table("ai_analysis").update({
                "status":        "failed",
                "failed":        True,
                "error_message": f"{type(e).__name__}: {str(e)}",
            }).eq("case_id", case_id).execute()
        except Exception as db_err:
            logger.error(f"[Burst 1] Could not update failed status: {db_err}")
 
        # BURST_1_PROCESSING → PROCESSING_FAILED (valid transition)
        try:
            transition(case_id, CaseState.PROCESSING_FAILED, actor_id="system")
        except Exception as te:
            logger.error(f"[Burst 1] Could not transition to PROCESSING_FAILED: {te}")
 
        return {"status": "failed", "case_id": case_id, "error": str(e)}