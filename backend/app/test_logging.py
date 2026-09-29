import json
import logging
import sys

from app.logging import JsonFormatter, reset_correlation_id, set_correlation_id


def _record(**extra: object) -> logging.LogRecord:
    return logging.makeLogRecord({"name": "app.test", "levelname": "INFO", "msg": "hello", **extra})


def test_allowed_extras_are_kept_and_the_correlation_id_is_attached():
    token = set_correlation_id("req-1")
    try:
        entry = json.loads(JsonFormatter().format(_record(path="/eligibility", status_code=200)))
    finally:
        reset_correlation_id(token)

    assert entry["message"] == "hello"
    assert entry["correlation_id"] == "req-1"
    assert entry["path"] == "/eligibility"
    assert entry["status_code"] == 200
    assert "dropped_fields" not in entry


def test_unknown_extras_are_dropped_by_name_without_their_values():
    output = JsonFormatter().format(_record(description="student text", prompt="p"))
    entry = json.loads(output)

    assert entry["dropped_fields"] == ["description", "prompt"]
    assert "student text" not in output


def test_an_exception_is_logged_by_type_and_frames_never_its_message():
    # Built at runtime: the frames quote source lines, so a literal would appear in them.
    message = " ".join(["student", "text"])
    try:
        raise ValueError(message)
    except ValueError:
        record = _record(exc_info=sys.exc_info())

    output = JsonFormatter().format(record)
    entry = json.loads(output)

    assert entry["exception_type"] == "ValueError"
    assert "test_logging.py" in entry["exc_info"]
    assert "student text" not in output
