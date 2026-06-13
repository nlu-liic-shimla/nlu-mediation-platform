# from celery import shared_task
# from ai.pipeline_burst1 import run_burst1_pipeline
# import json

# @shared_task
# def process_burst_1(case_id: str):
#     """
#     Triggered automatically when both parties submit.
#     Fetches submissions, runs Burst 1 pipeline, saves to ai_analysis.
#     """
#     from app.core.database import supabase
#     from app.core.state_machine import transition

#     try:
#         # 1. Get both submissions
#         result = supabase.table("submissions")\
#             .select("*")\
#             .eq("case_id", case_id)\
#             .execute()

#         if not result.data or len(result.data) < 2:
#             raise Exception("Both submissions not found")

#         # Identify party A and party B by invitation role
#         party_a_statement = None
#         party_b_statement = None

#         for sub in result.data:
#             # Check case_invitations to determine role
#             inv = supabase.table("case_invitations")\
#                 .select("invitation_role")\
#                 .eq("case_id", case_id)\
#                 .eq("accepted_by", sub["party_id"])\
#                 .execute()

#             if inv.data:
#                 role = inv.data[0]["invitation_role"]
#                 if role == "requesting_party":
#                     party_a_statement = sub["statement"]
#                 elif role == "against_party":
#                     party_b_statement = sub["statement"]

#         if not party_a_statement or not party_b_statement:
#             raise Exception("Could not identify party statements")

#         # 2. Run Burst 1 pipeline
#         burst1_result = run_burst1_pipeline(
#             party_a_statement=party_a_statement,
#             party_b_statement=party_b_statement,
#             case_id=case_id
#         )

#         # 3. Save to ai_analysis table
#         supabase.table("ai_analysis").insert({
#             "case_id": case_id,
#             "burst_number": 1,
#             "tone_analysis": burst1_result.tone_analysis.model_dump()
#                 if burst1_result.tone_analysis else None,
#             "bias_removal": burst1_result.bias_removal.model_dump()
#                 if burst1_result.bias_removal else None,
#             "conflict_extraction": burst1_result.conflict_extraction.model_dump()
#                 if burst1_result.conflict_extraction else None,
#             "neutral_summary": burst1_result.neutral_summary.model_dump()
#                 if burst1_result.neutral_summary else None,
#             "mediatability": burst1_result.mediatability.model_dump()
#                 if burst1_result.mediatability else None,
#             "completed_steps": burst1_result.completed_steps,
#             "status": "complete",
#             "completed_at": "now()"
#         }).execute()

#         # 4. Transition state
#         transition(case_id, "BURST_1_COMPLETE")

#     except Exception as e:
#         print(f"[ERROR] Burst 1 failed for case {case_id}: {e}")
#         transition(case_id, "PROCESSING_FAILED")
#         raise




# tasks.py
# Location: nlu-backend/tasks.py  (root level — do NOT move this file)
# Updated: Week 3 — full Burst 1 AI pipeline
#
# PIPELINE ORDER (confirmed from subsystem code):
#   Step 1: F  — tone_analysis      on RAW statements
#   Step 2: A  — conflict_extraction on RAW statements
#   Step 3: B  — neutral_summary    on ConflictExtraction output
#   Step 4: E  — bias_removal       on NeutralSummary output
#   Step 5: G  — mediatability      on ConflictExtraction output
#
# WHY THIS ORDER:
#   F must run on raw text to capture true emotional signal before cleaning
#   A runs on raw text to extract facts before any bias removal
#   B summarises what A extracted — needs A output
#   E checks B's summary for bias — needs B output
#   G scores mediatability from A's structured data — needs A output
#
# NOTE ON IMPORTS:
#   AI module lives at ../ai/ relative to nlu-backend/
#   sys.path manipulation below makes these imports work when
#   Celery worker is launched from nlu-backend/ directory

import os
import sys
import ssl
import logging
from datetime import datetime, timezone

# ── Path setup ────────────────────────────────────────────────────────────────
# The ai/ folder is one level up from nlu-backend/
# This must happen BEFORE any ai.* imports
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

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
    # Hard timeout — if task runs longer than 6 minutes, kill it
    # This prevents cases from being stuck in BURST_1_PROCESSING forever
    task_time_limit=360,
    task_soft_time_limit=300,
    # Prevent duplicate task redelivery after Redis reconnect
    task_acks_late=True,
    worker_cancel_long_running_tasks_on_connection_loss=True,
)

logger = logging.getLogger(__name__)


# ── Supabase helper ───────────────────────────────────────────────────────────
# Creates a fresh Supabase client inside the Celery worker process.
# Cannot reuse the FastAPI app's supabase client across process boundaries.

def get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )


# ── Hello task (smoke test) ───────────────────────────────────────────────────

@celery_app.task(name="tasks.hello")
def hello():
    """Smoke test — run this to verify Celery + Redis is working."""
    logger.info("Hello from Celery!")
    return {"status": "ok", "message": "Hello from Celery!"}


# ── Burst 1 pipeline ──────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.process_burst_1",
    max_retries=0,          # We handle our own error state — no auto-retry
    time_limit=360,
    soft_time_limit=300,
)
def process_burst_1(self, case_id: str):
    """
    Full Burst 1 AI pipeline.
    Triggered automatically when both parties submit their statements.

    On success: case transitions to BURST_1_COMPLETE
    On any failure: case transitions to PROCESSING_FAILED
                    mediator can retry via POST /cases/{id}/analysis/retry-full

    Pipeline steps:
        1. F  — tone analysis on raw statements (mediator only)
        2. A  — conflict extraction on raw statements
        3. B  — neutral summary from conflict extraction JSON
        4. E  — bias removal on neutral summary
        5. G  — mediatability score from conflict extraction JSON
    """
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    logger.info(f"[Burst 1] Starting for case {case_id}")

    # ── Import state machine ───────────────────────────────────────────────────
    # Import here (not at module level) to avoid circular imports
    # when Celery worker boots before FastAPI app is fully initialised
    from app.core.state_machine import transition, CaseState

    try:
        # ── Idempotency guard ─────────────────────────────────────────────────
        # Prevents 409 crash on duplicate task delivery after Redis reconnect.
        current = supabase.table("cases").select("status").eq("id", case_id).single().execute()
        current_status = current.data.get("status") if current.data else None

        if current_status == CaseState.BURST_1_PROCESSING:
            logger.warning(
                f"[Burst 1] Case {case_id} already BURST_1_PROCESSING "
                f"— duplicate delivery, skipping."
            )
            return {"status": "skipped", "case_id": case_id, "reason": "already processing"}

        if current_status != CaseState.BOTH_SUBMITTED:
            logger.warning(
                f"[Burst 1] Unexpected status '{current_status}' for case {case_id} — skipping."
            )
            return {"status": "skipped", "case_id": case_id, "reason": f"unexpected status: {current_status}"}

        # ── Transition to BURST_1_PROCESSING ──────────────────────────────────
        transition(case_id, CaseState.BURST_1_PROCESSING, actor_id="system")

        # ── Create ai_analysis tracking record ────────────────────────────────
        # This record is what GET /cases/{id}/analysis/status reads
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

        # ── Identify which submission belongs to which role ────────────────────
        # We look up each party's role via case_invitations
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

        # ══════════════════════════════════════════════════════════════════════
        # STEP 1 — Sub-system F: Tone Analysis
        # Runs on RAW statements — must be before any cleaning
        # Mediator only — never shown to parties
        # ══════════════════════════════════════════════════════════════════════
        logger.info(f"[Burst 1] Step 1 — Tone analysis (F) for case {case_id}")

        tone_result = analyse_tone(statement_a, statement_b)

        if is_failed(tone_result):
            # F is non-critical — log warning but continue pipeline
            # Mediator sees a warning badge, case still proceeds
            logger.warning(
                f"[Burst 1] Sub-system F failed for case {case_id}: "
                f"{tone_result.get('reason', 'unknown')}"
            )
            tone_data = None
        else:
            tone_data = tone_result.model_dump()
            logger.info(f"[Burst 1] Step 1 complete — tone analysis done")

        # Save F result immediately — partial saves mean retry can see progress
        supabase.table("ai_analysis").update({
            "tone_analysis": tone_data,
        }).eq("case_id", case_id).execute()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 2 — Sub-system A: Conflict Extraction
        # Runs on RAW statements
        # CRITICAL — if this fails, entire pipeline fails
        # All downstream subsystems depend on ConflictExtraction output
        # ══════════════════════════════════════════════════════════════════════
        logger.info(f"[Burst 1] Step 2 — Conflict extraction (A) for case {case_id}")

        conflict_result = extract_conflict(statement_a, statement_b)

        if is_failed(conflict_result):
            # A is critical — cannot continue without it
            raise ValueError(
                f"Sub-system A (conflict extraction) failed after retries: "
                f"{conflict_result.get('reason', 'unknown')}"
            )

        logger.info(
            f"[Burst 1] Step 2 complete — dispute_type={conflict_result.dispute_type}, "
            f"confidence={conflict_result.extraction_confidence}"
        )

        # Save A result
        supabase.table("ai_analysis").update({
            "conflict_extraction": conflict_result.model_dump(),
        }).eq("case_id", case_id).execute()

        # Warn mediator if confidence is low — case still proceeds
        if conflict_result.extraction_confidence < 0.5:
            logger.warning(
                f"[Burst 1] Low extraction confidence ({conflict_result.extraction_confidence}) "
                f"for case {case_id} — mediator will see yellow badge"
            )

        # ══════════════════════════════════════════════════════════════════════
        # STEP 3 — Sub-system B: Neutral Summary
        # Input: ConflictExtraction output from Step 2
        # Never receives raw statements directly
        # ══════════════════════════════════════════════════════════════════════
        logger.info(f"[Burst 1] Step 3 — Neutral summary (B) for case {case_id}")

        summary_result = generate_neutral_summary(conflict_result)

        if is_failed(summary_result):
            logger.warning(
                f"[Burst 1] Sub-system B failed for case {case_id}: "
                f"{summary_result.get('reason', 'unknown')}"
            )
            summary_data = None
            bias_data = None
        else:
            summary_data = summary_result.model_dump()
            logger.info(f"[Burst 1] Step 3 complete — neutral summary generated")

            # ══════════════════════════════════════════════════════════════════
            # STEP 4 — Sub-system E: Bias Removal
            # Input: NeutralSummary output from Step 3
            # Runs on B's output — not on raw statements
            # ══════════════════════════════════════════════════════════════════
            logger.info(f"[Burst 1] Step 4 — Bias removal (E) for case {case_id}")

            bias_result = remove_bias(summary_result)

            if is_failed(bias_result):
                logger.warning(
                    f"[Burst 1] Sub-system E failed for case {case_id}: "
                    f"{bias_result.get('reason', 'unknown')}"
                )
                bias_data = None
            else:
                bias_data = bias_result.model_dump()
                logger.info(
                    f"[Burst 1] Step 4 complete — "
                    f"bias_detected={bias_result.bias_detected}, "
                    f"bias_check_passed={bias_result.bias_check_passed}"
                )

        # Save B + E results together
        supabase.table("ai_analysis").update({
            "neutral_summary": summary_data,
            "bias_removal": bias_data,
        }).eq("case_id", case_id).execute()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 5 — Sub-system G: Mediatability Score
        # Input: ConflictExtraction output from Step 2
        # Score is deterministic Python — Haiku only writes justification
        # ══════════════════════════════════════════════════════════════════════
        logger.info(f"[Burst 1] Step 5 — Mediatability score (G) for case {case_id}")

        mediatability_result = calculate_mediatability(conflict_result)

        if is_failed(mediatability_result):
            logger.warning(
                f"[Burst 1] Sub-system G failed for case {case_id}"
            )
            mediatability_data = None
        else:
            mediatability_data = mediatability_result.model_dump()
            logger.info(
                f"[Burst 1] Step 5 complete — "
                f"score={mediatability_result.mediatability_score}, "
                f"band={mediatability_result.mediatability_band}"
            )

        # ══════════════════════════════════════════════════════════════════════
        # FINAL — Mark complete and transition case state
        # ══════════════════════════════════════════════════════════════════════
        completed_at = datetime.now(timezone.utc).isoformat()

        supabase.table("ai_analysis").update({
            "mediatability": mediatability_data,
            "status": "complete",
            "completed_at": completed_at,
            "failed": False,
        }).eq("case_id", case_id).execute()

        # Transition case to BURST_1_COMPLETE
        transition(case_id, CaseState.BURST_1_COMPLETE, actor_id="system")

        logger.info(f"[Burst 1] Pipeline COMPLETE for case {case_id}")

        return {
            "status": "complete",
            "case_id": case_id,
            "completed_at": completed_at,
        }

    except Exception as e:
        # ── Any unhandled exception → PROCESSING_FAILED ───────────────────────
        # Mediator sees retry button. Parties see neutral "analysis in progress".
        logger.error(
            f"[Burst 1] FAILED for case {case_id}: {type(e).__name__}: {e}",
            exc_info=True
        )

        # Mark ai_analysis record as failed
        try:
            supabase.table("ai_analysis").update({
                "status": "failed",
                "failed": True,
                "error_message": f"{type(e).__name__}: {str(e)}",
            }).eq("case_id", case_id).execute()
        except Exception as db_err:
            logger.error(
                f"[Burst 1] Could not update ai_analysis failed status: {db_err}"
            )

        # Transition to PROCESSING_FAILED
        # Wrapped in try/except because if case is already in PROCESSING_FAILED
        # (e.g. double-trigger), the transition() call will raise 409
        try:
            transition(case_id, CaseState.PROCESSING_FAILED, actor_id="system")
        except Exception as transition_err:
            logger.error(
                f"[Burst 1] Could not transition to PROCESSING_FAILED: {transition_err}"
            )

        # Do NOT re-raise — let the task complete as FAILURE state in Celery
        # Retrying would re-run the pipeline without mediator knowing
        return {
            "status": "failed",
            "case_id": case_id,
            "error": str(e),
        }


# ── Process submission received ───────────────────────────────────────────────

@celery_app.task(name="tasks.process_submission_received")
def process_submission_received(case_id: str):
    """
    Triggered when a submission is received.
    Checks if both parties have submitted — if so, fires process_burst_1.
    """
    supabase = get_supabase()

    submissions = supabase.table("submissions").select(
        "party_id"
    ).eq("case_id", case_id).execute()

    count = len(submissions.data) if submissions.data else 0
    logger.info(f"[Submission] Case {case_id} has {count}/2 submissions")

    if count >= 2:
        logger.info(f"[Submission] Both submitted for case {case_id} — queuing Burst 1")
        process_burst_1.delay(case_id)
    
    return {"status": "ok", "case_id": case_id, "submission_count": count}

    # ─────────────────────────────────────────────────────────────────────────────
# ADD THESE THREE TASKS TO YOUR EXISTING tasks.py
# Do NOT replace your whole tasks.py — just append these to the bottom.
# Niharika (Backend 2) will fill in the AI logic inside process_burst_2.
# Your job here is to define the task signatures and state transitions
# so she can import and call them.
# ─────────────────────────────────────────────────────────────────────────────

from app.core.state_machine import transition, CaseState
from app.core.database import supabase
import logging

logger = logging.getLogger(__name__)


# ── Task 1: Burst 2 AI Pipeline ────────────────────────────────────────────────
# WHO OWNS THIS: Niharika fills the AI logic (lines marked with # NIHARIKA)
# YOUR JOB: The skeleton, state transitions, error handling, timeout

@celery_app.task(bind=True, time_limit=300, soft_time_limit=270)
def process_burst_2(self, case_id: str):
    """
    Burst 2 AI Pipeline — BATNA/WATNA Analysis

    TRIGGERED BY:
        questionnaires.py → submit_questionnaire_response()
        when response_count >= 2 (both parties answered)

    WHAT IT DOES:
        1. Transitions to BURST_2_PROCESSING
        2. Fetches conflict_extraction from ai_analysis (burst_number=1)
        3. Fetches both parties' questionnaire responses
        4. Calls Sub-system D (BATNA/WATNA)
        5. Saves BatnaWatnaOutput to ai_analysis (burst_number=2)
        6. Transitions to BURST_2_COMPLETE

    ON ANY FAILURE:
        Transitions to PROCESSING_FAILED
        Mediator can retry via POST /cases/{id}/analysis/retry-burst-2

    WHY bind=True:
        Allows self.retry() if we want to add retry logic.
        Also gives us self.request.id (the Celery task ID) for logging.

    WHY time_limit=300, soft_time_limit=270:
        Hard limit: Celery kills the task at 300 seconds (5 min)
        Soft limit: Raises SoftTimeLimitExceeded at 270 seconds
        The 30-second gap gives us time to catch the soft limit,
        transition to PROCESSING_FAILED, and log cleanly before
        the hard kill happens.
    """
    logger.info(f"[Burst 2] Starting for case {case_id}")

    try:
        # Step 1: Transition to BURST_2_PROCESSING
        transition(
            case_id=case_id,
            new_state=CaseState.BURST_2_PROCESSING,
            actor_id="system",
            metadata={"celery_task_id": self.request.id},
        )

        # Step 2: Fetch conflict_extraction from Burst 1 results
        analysis_resp = supabase.table("ai_analysis") \
            .select("conflict_extraction") \
            .eq("case_id", case_id) \
            .eq("burst_number", 1) \
            .single() \
            .execute()

        if not analysis_resp.data or not analysis_resp.data.get("conflict_extraction"):
            raise ValueError(f"No Burst 1 conflict_extraction found for case {case_id}")

        conflict_extraction = analysis_resp.data["conflict_extraction"]

        # Step 3: Fetch the questionnaire and both parties' responses
        q_resp = supabase.table("questionnaires") \
            .select("id") \
            .eq("case_id", case_id) \
            .single() \
            .execute()

        if not q_resp.data:
            raise ValueError(f"No questionnaire found for case {case_id}")

        questionnaire_id = q_resp.data["id"]

        responses_resp = supabase.table("questionnaire_responses") \
            .select("respondent_id, answers") \
            .eq("questionnaire_id", questionnaire_id) \
            .execute()

        if not responses_resp.data or len(responses_resp.data) < 2:
            raise ValueError(
                f"Expected 2 questionnaire responses for case {case_id}, "
                f"found {len(responses_resp.data or [])}"
            )

        # Build a dict of { respondent_id: answers } for Sub-system D
        questionnaire_responses = {
            r["respondent_id"]: r["answers"]
            for r in responses_resp.data
        }

        # ── NIHARIKA: Fill in the Sub-system D call here ──────────────────────
        # Expected call:
        #   from ai.subsystems.subsystem_d import generate_batna_watna
        #   result = generate_batna_watna(conflict_extraction, questionnaire_responses)
        #
        # result should be a BatnaWatnaOutput Pydantic model (or dict after .dict())
        # The BATNA invariant (batna_score >= watna_score) is enforced inside
        # Sub-system D via Pydantic model_validator.
        #
        # Placeholder so the skeleton is importable without Sub-system D:
        from ai.subsystems.subsystem_d import generate_batna_watna
        from ai.schemas import ConflictExtraction
        conflict_obj = ConflictExtraction(**conflict_extraction)
        result = generate_batna_watna(conflict_obj, questionnaire_responses)
        # ── END NIHARIKA SECTION ─────────────────────────────────────────────

        if result is None:
            raise ValueError("Sub-system D returned no result (placeholder not yet replaced)")

        # Convert Pydantic model to dict if needed
        if hasattr(result, "dict"):
            result_dict = result.dict()
        elif hasattr(result, "model_dump"):
            result_dict = result.model_dump()
        else:
            result_dict = result

        # Step 5: Save Burst 2 results to ai_analysis table
        supabase.table("ai_analysis").insert({
            "case_id":      case_id,
            "burst_number": 2,
            "batna_watna":  result_dict,
        }).execute()

        # Step 6: Transition to BURST_2_COMPLETE
        transition(
            case_id=case_id,
            new_state=CaseState.BURST_2_COMPLETE,
            actor_id="system",
            metadata={"celery_task_id": self.request.id},
        )

        logger.info(f"[Burst 2] Completed successfully for case {case_id}")

    except Exception as e:
        logger.error(f"[Burst 2] FAILED for case {case_id}: {e}", exc_info=True)

        # Always transition to PROCESSING_FAILED on any unhandled exception.
        # This ensures the mediator sees a clear failure state and can retry,
        # instead of the case being stuck in BURST_2_PROCESSING forever.
        try:
            transition(
                case_id=case_id,
                new_state=CaseState.PROCESSING_FAILED,
                actor_id="system",
                metadata={"error": str(e), "celery_task_id": self.request.id},
            )
        except Exception as transition_error:
            # If even the failure transition fails, just log — do not raise.
            # The task is already failed; we do not want to mask the original error.
            logger.error(f"[Burst 2] Could not transition to PROCESSING_FAILED: {transition_error}")

        raise  # Re-raise so Celery marks the task as FAILED in its backend


# ── Task 2: Background proposal structure extraction ──────────────────────────
# This runs silently in the background after mediator saves a proposal.
# Mediator never sees this — the output is used by Sub-system H for revision.

@celery_app.task
def extract_proposal_structure(proposal_id: str):
    """
    Extracts structured JSON from a proposal's raw text.

    TRIGGERED BY:
        POST /cases/{id}/proposals     (on create)
        PATCH /cases/{id}/proposals/{p_id} (on save)

    WHY this exists:
        Mediators write proposals in natural language (free text).
        Sub-system H needs structured data (terms, conditions, timeline)
        to generate precise revision suggestions.
        We extract structure silently so mediators can write naturally.

    FAILURE HANDLING:
        If this fails, the proposal still exists and is usable.
        The mediator can still publish it.
        Sub-system H will just receive less structured input.
        We log but do not crash — this is a background enhancement, not critical path.
    """
    logger.info(f"[ProposalStructure] Starting extraction for proposal {proposal_id}")

    try:
        proposal_resp = supabase.table("proposals") \
            .select("raw_text") \
            .eq("id", proposal_id) \
            .single() \
            .execute()

        if not proposal_resp.data:
            logger.warning(f"[ProposalStructure] Proposal {proposal_id} not found")
            return

        raw_text = proposal_resp.data["raw_text"]

        # ── NIHARIKA or VAIDANT: Fill in the structurer call here ────────────
        # Expected call:
        #   from ai.subsystems.proposal_structurer import extract_structure
        #   structured = extract_structure(raw_text)
        #   # structured should be: { "terms": [...], "conditions": [...], "timeline": "..." }
        #
        # Placeholder:
        structured = {"terms": [], "conditions": [], "timeline": "", "raw_text_length": len(raw_text)}
        # ── END SECTION ──────────────────────────────────────────────────────

        supabase.table("proposals").update({
            "structured_json": structured,
        }).eq("id", proposal_id).execute()

        logger.info(f"[ProposalStructure] Completed for proposal {proposal_id}")

    except Exception as e:
        # Non-critical — log and continue. Do not crash.
        logger.error(f"[ProposalStructure] Failed for proposal {proposal_id}: {e}")


# ── Task 3: Sub-system H — Proposal revision after rejection ──────────────────

@celery_app.task(time_limit=300)
def generate_proposal_revision(case_id: str, proposal_id: str):
    """
    Runs Sub-system H to generate a revised proposal draft after rejection.

    TRIGGERED BY:
        POST /cases/{id}/proposals/{p_id}/respond
        when any party rejects and case transitions to MEDIATION_IN_PROGRESS

    WHAT IT DOES:
        1. Fetches the current proposal text
        2. Fetches both parties' rejection reasons (if they rejected)
        3. Fetches BATNA/WATNA data for context
        4. Fetches mediator's private notes (fed as professional context)
        5. Calls Sub-system H
        6. Saves { revised_draft, changes_summary } to proposals.revision_suggestions

    MEDIATOR SEES:
        LEFT panel: previous proposal, rejection reasons, AI changes list
        RIGHT panel: editable text area pre-filled with revised_draft
        Mediator edits freely then publishes as new round.

    FAILURE HANDLING:
        If Sub-system H fails, revision_suggestions stays null.
        Mediator still sees the rejection reasons.
        Mediator can write their own revision from scratch.
        Log the error but do not block the mediator.
    """
    logger.info(f"[ProposalRevision] Starting Sub-system H for case {case_id}, proposal {proposal_id}")

    try:
        # Fetch proposal raw text
        proposal_resp = supabase.table("proposals") \
            .select("raw_text, round_number") \
            .eq("id", proposal_id) \
            .single() \
            .execute()

        if not proposal_resp.data:
            raise ValueError(f"Proposal {proposal_id} not found")

        raw_text     = proposal_resp.data["raw_text"]
        round_number = proposal_resp.data.get("round_number", 1)

        # Fetch rejection reasons from proposal_responses
        responses_resp = supabase.table("proposal_responses") \
            .select("party_id, decision, rejection_reason") \
            .eq("proposal_id", proposal_id) \
            .execute()

        requesting_reason = None
        against_reason    = None

        for r in (responses_resp.data or []):
            if r["decision"] != "reject":
                continue
            # Identify which party this is
            inv = supabase.table("case_invitations") \
                .select("invitation_role") \
                .eq("case_id", case_id) \
                .eq("accepted_by", r["party_id"]) \
                .single() \
                .execute()
            if inv.data:
                if inv.data["invitation_role"] == "requesting_party":
                    requesting_reason = r["rejection_reason"]
                else:
                    against_reason = r["rejection_reason"]

        # Fetch BATNA/WATNA for Sub-system H context
        batna_resp = supabase.table("ai_analysis") \
            .select("batna_watna") \
            .eq("case_id", case_id) \
            .eq("burst_number", 2) \
            .single() \
            .execute()

        batna_watna = batna_resp.data.get("batna_watna") if batna_resp.data else {}

        # Fetch mediator's private notes (fed as professional context to Sub-system H)
        case_resp = supabase.table("cases") \
            .select("mediator_notes") \
            .eq("id", case_id) \
            .single() \
            .execute()

        mediator_notes = case_resp.data.get("mediator_notes") if case_resp.data else None

        # ── VAIDANT: Fill in the Sub-system H call here ──────────────────────
        # Expected call:
        #   from ai.subsystems.subsystem_h import generate_proposal_revision as run_h
        #   result = run_h(
        #       proposal_raw_text=raw_text,
        #       requesting_party_rejection_reason=requesting_reason,
        #       against_party_rejection_reason=against_reason,
        #       batna_watna=batna_watna,
        #       round_number=round_number,
        #       mediator_notes=mediator_notes,
        #   )
        #   # result: { "revised_draft": str, "changes_summary": list[str], "reasoning": str }
        #
        # Placeholder:
        result = {
            "revised_draft":    raw_text,
            "changes_summary":  ["Sub-system H placeholder — Vaidant to implement"],
            "reasoning":        "Placeholder",
        }
        # ── END VAIDANT SECTION ──────────────────────────────────────────────

        # Save revision suggestions to the proposal
        supabase.table("proposals").update({
            "revision_suggestions": result,
        }).eq("id", proposal_id).execute()

        logger.info(
            f"[ProposalRevision] Completed for case {case_id}, proposal {proposal_id}. "
            f"Changes: {len(result.get('changes_summary', []))}"
        )

    except Exception as e:
        # Non-critical path — mediator can still create revision manually.
        logger.error(
            f"[ProposalRevision] Sub-system H failed for case {case_id}, "
            f"proposal {proposal_id}: {e}",
            exc_info=True,
        )
        # Save a failure marker so mediator UI can show "AI revision unavailable"
        try:
            supabase.table("proposals").update({
                "revision_suggestions": {
                    "error": True,
                    "message": "AI revision generation failed. Please write your revision manually.",
                },
            }).eq("id", proposal_id).execute()
        except Exception:
            pass  # If even saving the error fails, just log and move on
