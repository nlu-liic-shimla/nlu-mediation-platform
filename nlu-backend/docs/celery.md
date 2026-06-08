# Celery — NLU Mediation Platform

**Owner:** Backend Role 2  
**Last Updated:** Week 3  
**File location:** `/docs/celery.md`

---

## Overview

The platform uses Celery with Redis (Upstash) as the message broker and result backend. Celery runs AI pipeline tasks as background jobs so that FastAPI routes return immediately and the heavy AI work happens asynchronously.

---

## Broker

**Redis via Upstash** — hosted free tier.  
Connection URL stored in `.env` as `REDIS_URL`.  
Uses `rediss://` (TLS) scheme — SSL cert verification is disabled via `ssl_cert_reqs=ssl.CERT_NONE` because Upstash free tier does not provide a verifiable certificate chain.

---

## Celery App Configuration

File: `app/celery/tasks.py`

```python
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
```

**Why `worker_pool=solo`:** Windows does not support the default `prefork` pool. The `solo` pool runs tasks synchronously in the worker process. This is correct for development on Windows. Do not change this for production without testing.

---

## How to Start the Worker (Windows PowerShell)

From the `nlu-backend` directory with your venv activated:

```powershell
celery -A app.celery.tasks.celery_app worker --loglevel=info --pool=solo
```

You should see:

```
[celery@hostname] ready.
```

If you see a Redis connection error, check that `REDIS_URL` in your `.env` starts with `rediss://` (double s).

---

## Tasks

### `hello`
Smoke test task. Prints `Hello from Celery!` and returns `"ok"`.  
Used to verify the worker is running correctly.

```python
from app.celery.tasks import hello
hello.delay()
```

### `process_burst_1(case_id: str)`
**Triggered when:** both parties submit their statements — case transitions to `BOTH_SUBMITTED`.  
**What it does:**
1. Transitions case state to `BURST_1_PROCESSING`
2. Inserts a tracking record into `ai_analysis` table
3. (Week 3) Calls full AI sub-system chain: F + E → A → B + G
4. Saves each sub-system result to `ai_analysis` table
5. Transitions case to `BURST_1_COMPLETE` on success

**On any exception:**
- Transitions case to `PROCESSING_FAILED`
- Updates `ai_analysis` record with `failed = true`
- Retries up to 3 times with 60-second countdown between attempts

**Timeout:** 5 minutes. If the task exceeds this, it is terminated and `PROCESSING_FAILED` is set.

**How to trigger manually (for testing):**

```python
from app.celery.tasks import process_burst_1
process_burst_1.delay("your-case-id-here")
```

---

## Burst 1 Pipeline Chain (Week 3)

The full chain structure once wired by Backend Role 1:

```
Step 1 (parallel): Sub-system F (tone analysis) + Sub-system E (bias removal)
Step 2:            Sub-system A (conflict extraction) — uses E output, falls back to raw if E failed
Step 3:            Sub-system B (neutral summary) — uses A output
Step 4 (parallel): Sub-system G (mediatability score) — uses A output
```

Each step saves its result to the `ai_analysis` table before proceeding. If any step raises an unhandled exception, the entire pipeline transitions to `PROCESSING_FAILED`.

---

## Retry Endpoint

`POST /api/v1/cases/{case_id}/analysis/retry-full` — mediator only.

What happens when the mediator clicks Retry:
1. Clears sub-system result columns in `ai_analysis` for this case
2. Resets `failed = false`
3. Transitions case from `PROCESSING_FAILED` → `BURST_1_PROCESSING`
4. Calls `process_burst_1.delay(case_id)` to re-queue the task
5. Returns `{"status": "retrying", "case_id": "..."}`

The retry is only allowed when the case is in `PROCESSING_FAILED` state. Any other state returns `409 Conflict`.

---

## PROCESSING_FAILED Handling

If Burst 1 fails:
- Case status becomes `PROCESSING_FAILED`
- `ai_analysis.failed` is set to `true`
- Mediator sees a retry UI on the case detail screen
- Mediator clicks retry → hits the retry endpoint → pipeline re-queues

The mediator is the only person who can trigger a retry. Parties see a generic "Analysis in progress" message and are not shown the failure state.

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `REDIS_URL` | Full Upstash Redis connection string — must start with `rediss://` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key (not anon key — tasks run as system) |

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `SSL: CERTIFICATE_VERIFY_FAILED` | Missing SSL config | Confirm `broker_use_ssl` and `redis_backend_use_ssl` both have `ssl_cert_reqs=ssl.CERT_NONE` |
| `kombu.exceptions.OperationalError` | Redis not reachable | Check `REDIS_URL` in `.env`. Test with `redis-py` ping script. |
| `Task received but not executing` | Wrong pool on Windows | Add `--pool=solo` flag to worker start command |
| `ModuleNotFoundError` on task import | venv not activated | Activate venv before starting worker |