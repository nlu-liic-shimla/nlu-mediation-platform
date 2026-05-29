# NLU Mediation Platform — Backend Role 2

FastAPI backend for NLU Shimla AI-Powered Mediation Platform.
Intern Project 2026 — Backend Role 2

## Tech Stack

- Python 3.11
- FastAPI + Swagger UI
- Supabase (PostgreSQL + Storage)
- Redis (Upstash)
- Celery (background tasks)
- JWT Authentication

## How to Run Locally

**Step 1 — Clone the repo and go to backend folder**
```
git clone https://github.com/vaidant07/nlu-mediation-platform.git
cd nlu-mediation-platform/nlu-backend
```

**Step 2 — Create and activate virtual environment**
```
python -m venv venv
venv\Scripts\activate
```

**Step 3 — Install dependencies**
```
pip install -r requirements.txt
```

**Step 4 — Set up environment variables**
```
copy .env.example .env
```
Open .env and fill in real values from your team lead.

**Step 5 — Run the server**
```
uvicorn main:app --reload
```

**Step 6 — Open API docs**
```
http://localhost:8000/docs
```

---

## Week 1 — Setup & Foundation

### What Was Built
- Supabase project created and connection verified
- Redis provisioned on Upstash — ping test passing
- Case CRUD routes: `POST /cases`, `GET /cases`, `GET /cases/{id}`
- Submissions stubs: `GET` and `POST /cases/{id}/submissions`
- Case Pydantic models
- Celery app with hello_task smoke test
- `backend .env.example` and `frontend .env.example` committed

### Endpoints
```
GET   /api/v1/health                    No auth       Health check
GET   /api/v1/cases                     Auth required Get all cases
POST  /api/v1/cases                     Mediator only Create new case
GET   /api/v1/cases/{id}                Auth required Get single case
GET   /api/v1/cases/{id}/submissions    Auth required List submissions (stub)
POST  /api/v1/cases/{id}/submissions    Party only    Submit statement (stub)
```

### Milestones Verified
```
M1-13   Redis accessible + Celery worker starts    PASSED
        Case routes with role middleware            PASSED
        .env and pycache excluded from repo         PASSED
        frontend .env.example committed             PASSED
        backend .env.example with REDIS_URL         PASSED
```

### Running Celery Worker (Week 1)
```
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```

---

## Week 2 — Document Upload & Celery Pipeline

### What Was Built
- Supabase Storage bucket `case-documents` configured as private
- Signed URL endpoint — party uploads directly to Supabase Storage
- Document confirm endpoint — saves metadata to DB after upload
- Document list endpoint — mediator sees all, party sees own
- Celery `process_burst_1` task — triggers on `BOTH_SUBMITTED`
- Error handling — transitions to `PROCESSING_FAILED` on exception
- 5-minute task timeout
- `docs/celery.md` documentation

### Endpoints
```
POST  /api/v1/cases/{id}/documents/upload-url   Party only    Get signed URL
POST  /api/v1/cases/{id}/documents/confirm       Party only    Save metadata
GET   /api/v1/cases/{id}/documents              Auth required  List documents
```

### Milestones Verified
```
W2-06   Both submissions trigger Celery task       PASSED
W2-07   PROCESSING_FAILED state on error           PASSED
W2-11   Signed URL document upload working         PASSED
        celery.md documentation committed          PASSED
```

---

## Project Structure

```
nlu-backend/
|-- app/
|   |-- api/v1/routes/
|   |   |-- cases.py          (case CRUD + submissions + analysis status)
|   |   |-- documents.py      (signed URL + confirm + list)
|   |   |-- invitations.py    (invite + accept)
|   |   |-- auth.py
|   |-- models/
|   |   |-- cases.py
|   |   |-- documents.py
|   |-- worker/
|       |-- celery_app.py
|       |-- tasks.py
|-- scripts/
|   |-- test_redis.py
|   |-- test_celery.py
|-- docs/
|   |-- celery.md
|-- main.py
|-- requirements.txt
|-- .env.example
|-- frontend.env.example
```

## Environment Variables

```
SUPABASE_URL      — Your Supabase project URL
SUPABASE_KEY      — Your Supabase anon key
JWT_SECRET        — Secret key for JWT (min 32 chars)
REDIS_URL         — Upstash Redis URL (rediss://...)
ANTHROPIC_API_KEY — Claude API key (AI Role provides this)
```

## Architecture Rules

1. Never set case.status directly — always use state_machine.transition()
2. Parties always get 403 (never 404) when accessing wrong case
3. All AI outputs validated by Pydantic schemas from ai/schemas.py
4. No direct commits to main — always via Pull Request
5. Every new Supabase table needs INSERT and SELECT RLS policies

---

NLU Shimla — Intern Project 2026 — Team Confidential