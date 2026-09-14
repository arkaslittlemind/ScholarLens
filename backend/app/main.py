"""ScholarLens API — application entry point.

Run locally:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="ScholarLens API",
    version="0.1.0",
    description="Backend for the ScholarLens scholarship-eligibility assistant.",
)

app.include_router(router)
