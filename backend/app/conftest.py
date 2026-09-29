from collections.abc import Callable

import pytest
from pydantic_ai import models

from app.config import Settings

# Any real model request from a test fails loudly instead of spending Gemini credits; the
# scripted FunctionModel and TestModel are exempt.
models.ALLOW_MODEL_REQUESTS = False


@pytest.fixture
def make_settings() -> Callable[..., Settings]:
    """Build Settings from explicit values only, so a developer's `.env` keys never reach a test."""

    def build(**overrides: object) -> Settings:
        return Settings(_env_file=None, **overrides)

    return build
