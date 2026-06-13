from fastapi import APIRouter
from app.api.v1.routes import auth, cases, invitations, documents, questionnaires

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(invitations.router)
api_router.include_router(documents.router)
api_router.include_router(questionnaires.router)