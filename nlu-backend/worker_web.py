"""
worker_web.py
Wraps the Celery worker in a minimal FastAPI app so it can run on
Render's free Web Service tier (Background Workers have no free tier).

An external uptime pinger (UptimeRobot) must hit the "/" route every
10-14 minutes to prevent Render's free tier from spinning this down
after 15 minutes of inactivity.
"""

import os
import threading
from fastapi import FastAPI
import uvicorn

from tasks import celery_app

app = FastAPI()

@app.get("/")
def health():
    return {"status": "worker alive"}

def start_celery_worker():
    celery_app.worker_main([
        "worker",
        "--pool=solo",
        "--loglevel=info",
    ])

if __name__ == "__main__":
    worker_thread = threading.Thread(target=start_celery_worker, daemon=True)
    worker_thread.start()

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
