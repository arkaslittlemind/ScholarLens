from app.api.rate_limit import RateLimiter

# Mid-window and far from any UTC-day edge, so only the window under test rolls.
_START = 1_000_000 * 86_400 + 3_600 + 10.0


class _Clock:
    def __init__(self) -> None:
        self.now = _START

    def __call__(self) -> float:
        return self.now


def _limiter(per_minute=5, per_day=20, global_per_day=100) -> tuple[RateLimiter, _Clock]:
    clock = _Clock()
    return RateLimiter(per_minute, per_day, global_per_day, clock=clock), clock


def test_per_minute_limit_rejects_with_the_seconds_left_in_the_minute():
    limiter, _ = _limiter(per_minute=2)
    assert limiter.acquire("1.1.1.1") is None
    assert limiter.acquire("1.1.1.1") is None
    assert limiter.acquire("1.1.1.1") == 50


def test_clients_are_counted_separately():
    limiter, _ = _limiter(per_minute=1)
    assert limiter.acquire("1.1.1.1") is None
    assert limiter.acquire("2.2.2.2") is None


def test_a_new_minute_resets_the_minute_window():
    limiter, clock = _limiter(per_minute=1)
    limiter.acquire("1.1.1.1")
    clock.now += 50
    assert limiter.acquire("1.1.1.1") is None


def test_a_rejected_request_is_not_counted():
    limiter, clock = _limiter(per_minute=1, per_day=2)
    limiter.acquire("1.1.1.1")
    for _ in range(5):
        assert limiter.acquire("1.1.1.1") is not None
    clock.now += 60
    # Only the one accepted request counted toward the day, so one more fits.
    assert limiter.acquire("1.1.1.1") is None
    clock.now += 60
    assert limiter.acquire("1.1.1.1") is not None


def test_the_daily_limit_waits_until_the_utc_day_ends():
    limiter, clock = _limiter(per_minute=10, per_day=1)
    limiter.acquire("1.1.1.1")
    assert limiter.acquire("1.1.1.1") == 86_400 - 3_610


def test_the_global_limit_applies_across_clients():
    limiter, _ = _limiter(global_per_day=2)
    limiter.acquire("1.1.1.1")
    limiter.acquire("2.2.2.2")
    assert limiter.acquire("3.3.3.3") == 86_400 - 3_610


def test_the_longest_violated_wait_wins():
    limiter, _ = _limiter(per_minute=1, per_day=1)
    limiter.acquire("1.1.1.1")
    assert limiter.acquire("1.1.1.1") == 86_400 - 3_610


def test_retry_after_is_at_least_one_second():
    limiter, clock = _limiter(per_minute=1)
    limiter.acquire("1.1.1.1")
    clock.now += 49.9
    assert limiter.acquire("1.1.1.1") == 1
