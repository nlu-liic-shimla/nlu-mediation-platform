from celery import Celery
import os
import ssl
from dotenv import load_dotenv
load_dotenv()

REDIS_URL = os.environ["REDIS_URL"]

celery_app = Celery(
    "nlu_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    broker_use_ssl={
        "ssl_cert_reqs": ssl.CERT_NONE
    },
    redis_backend_use_ssl={
        "ssl_cert_reqs": ssl.CERT_NONE
    },
    broker_pool_limit=1,
    redis_max_connections=5,
    broker_connection_retry_on_startup=True,
    worker_pool="solo",
)

@celery_app.task
def hello():
    print("Hello from Celery!")
    return "ok"