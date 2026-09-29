"""ScholarLens API — application entry point.

Run locally:
    uvicorn app.main:app --reload
"""

from app.application import create_app
from app.config import get_settings
from app.logging import configure_logging
from app.status_metrics import register_status_gauges
from app.telemetry import configure_telemetry

settings = get_settings()
configure_logging(settings.log_level)

app = create_app(settings)

configure_telemetry(settings, app)
register_status_gauges(settings)
