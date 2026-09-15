"""ScholarLens API — application entry point.

Run locally:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.eligibility import router as eligibility_router
from app.api.errors import register_error_handlers
from app.api.routes import router
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="ScholarLens API",
    version="0.1.0",
    description="Backend for the ScholarLens scholarship-eligibility assistant.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)

register_error_handlers(app)

app.include_router(router)
app.include_router(eligibility_router)
