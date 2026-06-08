import os
import ssl
import logging
from celery import Celery
from dotenv import load_dotenv

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