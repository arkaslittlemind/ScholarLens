"""One error envelope for every non-2xx response, and the handlers that emit it."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

ENGINE_UNAVAILABLE = "engine_unavailable"

_STATUS_CODES = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    503: ENGINE_UNAVAILABLE,
}

_MESSAGES = {
    "validation_error": "The request body failed validation.",
    "bad_request": "The request could not be processed.",
    "not_found": "The requested path does not exist.",
    "method_not_allowed": "That method is not allowed on this path.",
    ENGINE_UNAVAILABLE: "The eligibility engine is not available.",
    "internal_error": "The server encountered an unexpected error.",
}


def _code_for_status(status_code: int) -> str:
    # An unmapped status must never blame the server for a client error, or the reverse.
    if status_code in _STATUS_CODES:
        return _STATUS_CODES[status_code]
    return "bad_request" if status_code < 500 else "internal_error"


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: list[str] = []


class ErrorResponse(BaseModel):
    error: ErrorDetail


def _envelope(status_code: int, code: str, fields: list[str] | None = None) -> JSONResponse:
    detail = ErrorDetail(code=code, message=_MESSAGES[code], fields=fields or [])
    return JSONResponse(status_code=status_code, content=ErrorResponse(error=detail).model_dump())


def _failed_fields(exc: RequestValidationError) -> list[str]:
    # Names only: the raw location carries the submitted value, which must not be echoed.
    names = []
    for error in exc.errors():
        # Integer parts are a list index, or a character offset when the body is not valid JSON.
        location = [part for part in error["loc"] if isinstance(part, str) and part != "body"]
        if location:
            names.append(".".join(location))
    return names


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _envelope(422, "validation_error", _failed_fields(exc))

    # Starlette's base class, so unmatched routes are covered alongside FastAPI's subclass.
    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return _envelope(exc.status_code, _code_for_status(exc.status_code))

    @app.exception_handler(Exception)
    async def unhandled_error(_: Request, __: Exception) -> JSONResponse:
        return _envelope(500, "internal_error")
