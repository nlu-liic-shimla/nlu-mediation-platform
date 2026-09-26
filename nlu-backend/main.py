from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

app = FastAPI(
    title="NLU Mediation Platform",
    description="AI-Powered Mediation Platform — NLU Shimla Intern Project 2026",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "https://nlu-mediation-platform.vercel.app",
                  ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0"}

app.include_router(api_router)
