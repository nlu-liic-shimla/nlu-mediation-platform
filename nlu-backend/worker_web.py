"""
worker_web.py
Wraps the Celery worker in a minimal FastAPI app so it can run on
Render's free Web Service tier (Background Workers have no free tier).

Receives health check and wake-up pings (GET or HEAD) from the backend
or external monitors to prevent or recover from free-tier hibernation.
"""

import os
# Ensure worker process role is established before tasks module is imported
os.environ.setdefault("PROCESS_ROLE", "worker")

import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn

from tasks import celery_app

worker_thread = None
_worker_start_lock = threading.Lock()

def start_celery_worker():
    celery_app.worker_main([
        "worker",
        "--pool=solo",
        "--loglevel=info",
    ])

def _start_worker_if_needed():
    global worker_thread
    with _worker_start_lock:
        if worker_thread is None or not worker_thread.is_alive():
            worker_thread = threading.Thread(target=start_celery_worker, daemon=True)
            worker_thread.start()

@asynccontextmanager
async def lifespan(app: FastAPI):
    _start_worker_if_needed()
    yield

app = FastAPI(lifespan=lifespan)

@app.api_route("/", methods=["GET", "HEAD"])
def health():
    thread_alive = worker_thread.is_alive() if worker_thread is not None else False
    return {"status": "worker alive", "worker_thread_alive": thread_alive}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
