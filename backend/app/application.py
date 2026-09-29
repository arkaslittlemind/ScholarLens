"""Builds the FastAPI app from explicit settings, apart from process-wide setup in `app.main`."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.eligibility import router as eligibility_router
from app.api.errors import register_error_handlers
from app.api.middleware import CorrelationIdMiddleware
from app.api.ops import router as ops_router
from app.api.routes import router
from app.config import Settings


def create_app(settings: Settings) -> FastAPI:
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
        # Browsers hide non-safelisted response headers cross-origin; /check reads this one.
        expose_headers=["Retry-After"],
    )
    # Registered last so it is outermost and also sees requests CORS rejects.
    app.add_middleware(CorrelationIdMiddleware)

    register_error_handlers(app)

    app.include_router(router)
    app.include_router(eligibility_router)
    app.include_router(ops_router)
    return app
