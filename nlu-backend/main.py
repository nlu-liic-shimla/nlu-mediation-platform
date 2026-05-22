from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router

app = FastAPI(
    title="NLU Mediation Platform",
    description="AI-Powered Mediation Platform — NLU Shimla Intern Project 2026",
    version="1.0.0"
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs."}
    )

# Health check
@app.get("/api/v1/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0"}

# All routes
app.include_router(api_router)