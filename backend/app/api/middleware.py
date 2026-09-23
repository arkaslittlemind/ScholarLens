"""Assigns each request a correlation ID and writes one access-log line when it finishes."""

import logging
import re
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.logging import reset_correlation_id, set_correlation_id

REQUEST_ID_HEADER = "X-Request-ID"

# The client-supplied value lands in logs and a response header, so only safe tokens are reused.
_SAFE_REQUEST_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")

_access_logger = logging.getLogger("app.access")


def _request_id(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER, "")
    return incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else str(uuid.uuid4())


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = _request_id(request)
        # Starlette runs the unhandled-exception handler outside this middleware, after the reset.
        request.state.request_id = request_id
        token = set_correlation_id(request_id)
        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            _access_logger.info(
                "request completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                },
            )
            reset_correlation_id(token)
