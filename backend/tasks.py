from celery import Celery
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

# ✅ ssl.CERT_NONE object use kiya
celery_app = Celery(
    "nlu_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    broker_use_ssl={
        "ssl_cert_reqs": ssl.CERT_NONE
    },
    redis_backend_use_ssl={
        "ssl_cert_reqs": ssl.CERT_NONE
    }
)

@celery_app.task
def hello_task():
    print("Hello from Celery!")
    return {"status": "success", "message": "hello from celery"}