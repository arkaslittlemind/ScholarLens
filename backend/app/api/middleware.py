"""Assigns each request a correlation ID and writes one access-log line when it finishes."""

import logging
import re
import time
import uuid

from opentelemetry import trace
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.api.errors import unhandled_error_response
from app.logging import REQUEST_ID_HEADER, reset_correlation_id, set_correlation_id

# The client-supplied value lands in logs and a response header, so only safe tokens are reused.
_SAFE_REQUEST_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")

_access_logger = logging.getLogger("app.access")


def _request_id(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER, "")
    return incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else str(uuid.uuid4())


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = _request_id(request)
        request.state.request_id = request_id
        token = set_correlation_id(request_id)
        # Lets a trace be found from any log line of the same request.
        trace.get_current_span().set_attribute("app.request_id", request_id)
        start = time.perf_counter()
        status_code = 500
        try:
            try:
                response = await call_next(request)
            except Exception as exc:
                # Handled here, inside the tracing middleware, because an exception that escapes
                # gets its message recorded on the exported server span.
                response = unhandled_error_response(request, exc)
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
