# Celery Worker Documentation
Backend Role 2 | NLU Mediation Platform | Week 2

---

## Overview

Celery is used for background task processing. When both parties submit their dispute statements, a Celery task triggers automatically to start the AI analysis pipeline (Burst 1). Redis (Upstash) acts as the message broker — it receives tasks from FastAPI and delivers them to the Celery worker.

---

## How to Start the Worker

**Step 1 — Go to backend folder and activate venv**
```
cd nlu-mediation-platform/nlu-backend
venv\Scripts\activate
```

**Step 2 — Start the worker**
```
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```
Note: `--pool=solo` is required on Windows. On Mac/Linux you can omit it.

**Expected output:**
```
celery@DESKTOP ready.
Connected to rediss://...
```

---

## Available Tasks

| Task Name | Trigger | Description |
|-----------|---------|-------------|
| tasks.hello_task | Manual (smoke test) | Week 1 smoke test — confirms worker + Redis working |
| tasks.process_burst_1 | Auto — BOTH_SUBMITTED state | Starts AI analysis pipeline for a case |
| tasks.process_submission_received | Stub — Week 3 | Reserved for future use |

---

## How to Test Manually

**Test hello_task (smoke test):**

Terminal 1 — start worker:
```
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```

Terminal 2 — trigger task:
```
$env:PYTHONPATH = "."
python scripts/test_celery.py
```

**Expected Terminal 1 output:**
```
Task tasks.hello_task received
hello from celery — worker is running, broker connected.
Task tasks.hello_task succeeded
```

---

## How process_burst_1 Triggers

When both parties submit their statements, the submission endpoint calls `transition(case_id, BOTH_SUBMITTED)`. The state machine then fires:

```python
process_burst_1.delay(case_id)
```

This sends the task to Redis. The Celery worker picks it up and:
1. Transitions case to `BURST_1_PROCESSING`
2. Runs AI pipeline (Week 3 — placeholder sleep in Week 2)
3. Transitions case to `BURST_1_COMPLETE` on success

---

## PROCESSING_FAILED State

If `process_burst_1` raises any unhandled exception:
1. The error is logged to Celery worker logs
2. The case transitions to `PROCESSING_FAILED`
3. The task is marked as FAILED in Celery

**To test PROCESSING_FAILED manually:**

In `app/worker/tasks.py`, temporarily add `raise Exception("test error")` inside `process_burst_1` before the `time.sleep(2)` line. Trigger the task, then check:
- Celery worker logs show the error
- Case status in Supabase becomes `PROCESSING_FAILED`

Remove the test exception after verifying.

---

## Task Timeout

`process_burst_1` has a 5-minute hard timeout. If the task runs longer than 5 minutes it is automatically terminated and the case transitions to `PROCESSING_FAILED`.

---

## Monitoring Tasks

Check Celery worker logs in Terminal 1 for:
- `Task received` — task was picked up
- `Task succeeded` — task completed successfully
- `Task failed` — task raised an exception

---

## Redis Connection

Redis URL is stored in `.env` as `REDIS_URL`.
Format: `rediss://:password@host.upstash.io:6380`

To verify Redis is reachable:
```
python scripts/test_redis.py
```

Expected output:
```
[3/3] Redis connection verified. Ready for Celery.
```

---

NLU Shimla — Intern Project 2026 — Team Confidential