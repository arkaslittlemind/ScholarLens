"""In-process rate limits on the public eligibility endpoint, which spends model credits."""

import math
import time
from collections.abc import Callable
from functools import lru_cache

from app.config import get_settings

_MINUTE = 60
_DAY = 86_400
# Not a valid IP, so it can never collide with a client's own bucket.
_GLOBAL_KEY = "*all-clients*"


class _FixedWindow:
    """Counts per key within one epoch-aligned window; UTC days are epoch-aligned too."""

    def __init__(self, length: int, limit: int) -> None:
        self._length = length
        self._limit = limit
        self._window = -1
        self._counts: dict[str, int] = {}

    def _roll(self, now: float) -> None:
        window = int(now // self._length)
        if window != self._window:
            # Dropping the old window keeps memory bounded by keys seen in the current one.
            self._window = window
            self._counts = {}

    def retry_after(self, key: str, now: float) -> int | None:
        """Seconds until this window ends if `key` is at its limit, otherwise None."""
        self._roll(now)
        if self._counts.get(key, 0) < self._limit:
            return None
        return max(1, math.ceil((self._window + 1) * self._length - now))

    def add(self, key: str) -> None:
        self._counts[key] = self._counts.get(key, 0) + 1


class RateLimiter:
    def __init__(
        self,
        per_minute: int,
        per_day: int,
        global_per_day: int,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._clock = clock
        self._minute = _FixedWindow(_MINUTE, per_minute)
        self._day = _FixedWindow(_DAY, per_day)
        self._global_day = _FixedWindow(_DAY, global_per_day)

    def acquire(self, client_key: str) -> int | None:
        """Count one request, or return the Retry-After seconds without counting it.

        Nothing here awaits, so the check and the increments are atomic on the event loop.
        """
        now = self._clock()
        waits = [
            wait
            for wait in (
                self._minute.retry_after(client_key, now),
                self._day.retry_after(client_key, now),
                self._global_day.retry_after(_GLOBAL_KEY, now),
            )
            if wait is not None
        ]
        if waits:
            # The longest wait is the first moment every violated limit has reset.
            return max(waits)
        self._minute.add(client_key)
        self._day.add(client_key)
        self._global_day.add(_GLOBAL_KEY)
        return None


@lru_cache
def get_rate_limiter() -> RateLimiter:
    settings = get_settings()
    return RateLimiter(
        per_minute=settings.rate_limit_per_minute,
        per_day=settings.rate_limit_per_day,
        global_per_day=settings.rate_limit_global_per_day,
    )
