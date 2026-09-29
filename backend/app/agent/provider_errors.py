"""Recognise a model provider's rate-limit response, reading only its quota type and retry delay."""

import re
from dataclasses import dataclass
from typing import Literal

from pydantic_ai.exceptions import ModelHTTPError

QuotaType = Literal["per_minute", "daily", "unknown"]

_QUOTA_FAILURE = "type.googleapis.com/google.rpc.QuotaFailure"
_RETRY_INFO = "type.googleapis.com/google.rpc.RetryInfo"
_DELAY = re.compile(r"(\d+(?:\.\d+)?)s")


@dataclass(frozen=True)
class ProviderRateLimit:
    quota_type: QuotaType
    retry_after_seconds: float | None


def _details(body: object) -> list[dict[str, object]]:
    # Google's error body is untrusted provider JSON: any level may be missing or mistyped.
    error = body.get("error") if isinstance(body, dict) else None
    details = error.get("details") if isinstance(error, dict) else None
    if not isinstance(details, list):
        return []
    return [detail for detail in details if isinstance(detail, dict)]


def _quota_type(details: list[dict[str, object]]) -> QuotaType:
    quota_ids: list[str] = []
    for detail in details:
        violations = detail.get("violations") if detail.get("@type") == _QUOTA_FAILURE else None
        if isinstance(violations, list):
            quota_ids += [
                v["quotaId"]
                for v in violations
                if isinstance(v, dict) and isinstance(v.get("quotaId"), str)
            ]
    # A daily limit can't clear within one request, so it outranks any per-minute one.
    if any("PerDay" in quota_id for quota_id in quota_ids):
        return "daily"
    if any("PerMinute" in quota_id for quota_id in quota_ids):
        return "per_minute"
    return "unknown"


def _retry_after(details: list[dict[str, object]]) -> float | None:
    for detail in details:
        delay = detail.get("retryDelay") if detail.get("@type") == _RETRY_INFO else None
        match = _DELAY.fullmatch(delay) if isinstance(delay, str) else None
        if match and float(match.group(1)) > 0:
            return float(match.group(1))
    return None


def classify_rate_limit(exc: BaseException) -> ProviderRateLimit | None:
    """The quota type and suggested delay of a provider 429, or None for any other error."""
    if not isinstance(exc, ModelHTTPError) or exc.status_code != 429:
        return None
    details = _details(exc.body)
    return ProviderRateLimit(
        quota_type=_quota_type(details), retry_after_seconds=_retry_after(details)
    )
