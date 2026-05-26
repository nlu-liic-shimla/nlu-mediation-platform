import os
import logging
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
REDIS_URL = os.getenv("REDIS_URL")

if not REDIS_URL:
    raise EnvironmentError("REDIS_URL is not set in .env")

celery_app = Celery("nlu_mediation", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    broker_use_ssl={"ssl_cert_reqs": None},
    redis_backend_use_ssl={"ssl_cert_reqs": None},
    result_expires=3600,
)


@celery_app.task(name="tasks.hello_task", bind=True)
def hello_task(self):
    logger.info("hello from celery — worker is running, broker connected.")
    return {"status": "ok", "message": "hello from celery"}


@celery_app.task(name="tasks.process_submission_received", bind=True)
def process_submission_received(self, case_id: str):
    logger.info(f"[STUB] process_submission_received for case_id={case_id}")
    return {"status": "stub", "case_id": case_id}