# NLU Mediation Platform — API Documentation
Version: 1.0 | Week 1 | Intern Project 2026

## Base URL
`http://localhost:8000/api/v1`

## Authentication
All protected routes require this header:
`Authorization: Bearer <token>`

---

## Health Check

### GET /health
Check if server is running.
- **Auth required:** No
- **Response 200:**
```json
{"status": "ok", "version": "1.0"}
```

---

## Authentication Routes

### POST /auth/register
Register a new user.
- **Auth required:** No
- **Request body:**
```json
{
  "email": "user@example.com",
  "password": "string",
  "role": "mediator | requesting_party | against_party"
}
```
- **Response 201:**
```json
{"message": "User created successfully", "email": "user@example.com"}
```
- **Response 400:** User already exists
- **Response 422:** Validation error (missing fields)

---

### POST /auth/login
Login and receive JWT token.
- **Auth required:** No
- **Request body:**
```json
{"email": "user@example.com", "password": "string"}
```
- **Response 200:**
```json
{"access_token": "eyJ...", "token_type": "bearer"}
```
- **Response 401:** Invalid email or password

---

## Cases Routes

### GET /cases
Get list of cases.
- **Auth required:** Yes (any role)
- **Mediator:** sees all cases
- **Party:** sees only their own cases
- **Response 200:** Array of case objects

---

### POST /cases
Create a new case.
- **Auth required:** Yes
- **Allowed roles:** mediator only
- **Response 403:** If called by requesting_party or against_party
- **Request body:**
```json
{"title": "string", "description": "optional string"}
```
- **Response 201:**
```json
{
  "id": "uuid",
  "title": "string",
  "status": "INTAKE_PENDING",
  "created_by": "uuid",
  "negotiation_round": 0,
  "created_at": "timestamp"
}
```

---

### GET /cases/{case_id}
Get single case detail.
- **Auth required:** Yes (any role)
- **Response 403:** If party tries to access a case they don't belong to
- **Response 404:** Case not found
- **Response 200:** Case object