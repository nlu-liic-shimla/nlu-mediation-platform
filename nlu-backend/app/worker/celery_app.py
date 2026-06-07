import os
import ssl
import logging
from datetime import datetime
from celery import Celery
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    raise EnvironmentError("REDIS_URL is not set in .env")

celery_app = Celery(
    "nlu_mediation",
    broker=REDIS_URL,
    backend=REDIS_URL,
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    result_expires=3600,
)


@celery_app.task(name="tasks.hello", bind=True)
def hello(self):
    print("Hello from Celery!")
    return {"status": "ok", "message": "Hello from Celery!"}


@celery_app.task(name="tasks.process_submission_received", bind=True)
def process_submission_received(self, case_id: str):
    logger.info(f"[STUB] process_submission_received for case_id={case_id}")
    return {"status": "stub", "case_id": case_id}


@celery_app.task(name="tasks.process_burst_1", bind=True, max_retries=3)
def process_burst_1(self, case_id: str):
    try:
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"]
        )

        # Only transition to BURST_1_PROCESSING if not already there
        # (retry endpoint may have already done this transition)
        current = supabase.table("cases").select("status").eq("id", case_id).execute()
        if current.data and current.data[0]["status"] != "BURST_1_PROCESSING":
            from app.core.state_machine import transition, CaseState
            transition(case_id, CaseState.BURST_1_PROCESSING, actor_id="system")

        now = datetime.utcnow().isoformat()
        supabase.table("ai_analysis").insert({
            "case_id": case_id,
            "started_at": now,
            "failed": False,
            "analysis_type": "burst_1"
        }).execute()

        print(f"Burst 1 started for case {case_id}")

    except Exception as e:
        print(f"Burst 1 failed for case {case_id}: {e}")
        try:
            supabase = create_client(
                os.environ["SUPABASE_URL"],
                os.environ["SUPABASE_KEY"]
            )
            from app.core.state_machine import transition, CaseState
            transition(case_id, CaseState.PROCESSING_FAILED, actor_id="system")
            supabase.table("ai_analysis").update({
                "failed": True
            }).eq("case_id", case_id).execute()
        except Exception as inner_e:
            print(f"Failed to set PROCESSING_FAILED state: {inner_e}")
        raise self.retry(exc=e, countdown=60)