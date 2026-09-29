"""JSON log formatting and the per-request correlation ID every log line carries."""

import json
import logging
import sys
import traceback
from contextvars import ContextVar, Token
from datetime import UTC, datetime

REQUEST_ID_HEADER = "X-Request-ID"

_correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)

# Attributes every LogRecord has; anything else on a record came from `extra=`.
_RESERVED = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime", "taskName"}

# The only `extra=` fields written out. An unknown field is dropped by name, so a future call
# passing a request body or provider response cannot put its contents in the logs.
_ALLOWED_EXTRAS = {
    "correlation_id",
    "duration_ms",
    "error_type",
    "method",
    "path",
    "quota_type",
    "stack",
    "status_code",
}


def get_correlation_id() -> str | None:
    return _correlation_id.get()


def set_correlation_id(value: str | None) -> Token[str | None]:
    return _correlation_id.set(value)


def reset_correlation_id(token: Token[str | None]) -> None:
    _correlation_id.reset(token)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }
        extras = {k: v for k, v in record.__dict__.items() if k not in _RESERVED}
        entry.update({k: v for k, v in extras.items() if k in _ALLOWED_EXTRAS})
        dropped = sorted(k for k in extras if k not in _ALLOWED_EXTRAS)
        if dropped:
            entry["dropped_fields"] = dropped
        if record.exc_info and record.exc_info[0] is not None:
            error_type, _, tb = record.exc_info
            # Type and frames only: an exception message can echo the student's input.
            entry["exception_type"] = error_type.__name__
            entry["exc_info"] = "".join(traceback.format_tb(tb))
        return json.dumps(entry, default=str)


def configure_logging(level: str) -> None:
    """Route the `app` logger tree to stdout as JSON and silence uvicorn's access log."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("app")
    logger.handlers = [handler]
    logger.setLevel(level)
    logger.propagate = False
    # It prints the client's IP and port on every request; `app.access` already logs each
    # request without them.
    logging.getLogger("uvicorn.access").disabled = True
