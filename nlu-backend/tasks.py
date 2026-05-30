from celery import Celery
import os
import ssl
from dotenv import load_dotenv
from datetime import datetime
load_dotenv()

REDIS_URL = os.environ["REDIS_URL"]

celery_app = Celery(
    "nlu_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE},
    broker_pool_limit=1,
    redis_max_connections=5,
    broker_connection_retry_on_startup=True,
    worker_pool="solo",
)


@celery_app.task
def hello():
    print("Hello from Celery!")
    return "ok"


@celery_app.task(bind=True, max_retries=3)
def process_burst_1(self, case_id: str):
    """
    Burst 1 pipeline — triggered when both parties submit.
    Week 2: placeholder that transitions state correctly.
    Week 3: full AI pipeline added here.
    """
    try:
        from dotenv import load_dotenv
        load_dotenv()
        from supabase import create_client
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"]
        )
        from app.core.state_machine import transition, CaseState

        # Transition to processing
        transition(case_id, CaseState.BURST_1_PROCESSING, actor_id="system")

        # Insert ai_analysis record to track pipeline
        now = datetime.utcnow().isoformat()
        supabase.table("ai_analysis").insert({
            "case_id": case_id,
            "started_at": now,
            "failed": False,
            "analysis_type": "burst_1"
        }).execute()

        print(f"Burst 1 started for case {case_id}")

        # Week 3: AI subsystems will be called here

    except Exception as e:
        print(f"Burst 1 failed for case {case_id}: {e}")
        try:
            from supabase import create_client
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