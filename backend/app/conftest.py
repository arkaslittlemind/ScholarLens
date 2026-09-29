from collections.abc import Callable

import pytest

from app.config import Settings


@pytest.fixture
def make_settings() -> Callable[..., Settings]:
    """Build Settings from explicit values only, so a developer's `.env` keys never reach a test."""

    def build(**overrides: object) -> Settings:
        return Settings(_env_file=None, **overrides)

    return build
