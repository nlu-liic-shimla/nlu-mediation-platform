from fastapi import FastAPI
from routes.cases import router as cases_router

app = FastAPI()

# ✅ /api/v1/ prefix add kiya
app.include_router(cases_router, prefix="/api/v1")

@app.get("/")
def home():
    return {"message": "Backend running"}

# ✅ Health endpoint alag se
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0"}