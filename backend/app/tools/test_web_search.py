import asyncio
import json

import httpx
import pytest

from app.tools.web_search import WebSearchClient, WebSearchUnavailableError


@pytest.fixture
def search_with(monkeypatch, make_settings):
    """Route the client's only transport to a handler, so no test can reach Tavily."""

    def build(handler, **settings: object) -> tuple[WebSearchClient, list[httpx.Request]]:
        requests: list[httpx.Request] = []

        def record(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return handler(request)

        monkeypatch.setattr(httpx, "AsyncHTTPTransport", lambda **_: httpx.MockTransport(record))
        settings = {"tavily_api_key": "test-key", **settings}
        return WebSearchClient(make_settings(**settings)), requests

    return build


def test_results_map_content_to_snippet_and_send_top_k(search_with):
    body = {"results": [{"title": "Pell", "url": "https://e.org", "content": "Rule text"}, {}]}
    client, requests = search_with(lambda _: httpx.Response(200, json=body), retrieval_top_k=4)

    results = asyncio.run(client.search("pell grant"))

    assert results[0].model_dump() == {
        "title": "Pell",
        "url": "https://e.org",
        "snippet": "Rule text",
    }
    assert results[1].model_dump() == {"title": "", "url": "", "snippet": ""}
    sent = json.loads(requests[0].content)
    assert sent == {"api_key": "test-key", "query": "pell grant", "max_results": 4}


def test_a_missing_key_fails_without_a_request(search_with):
    client, requests = search_with(lambda _: httpx.Response(200, json={}), tavily_api_key=None)
    with pytest.raises(WebSearchUnavailableError, match="not configured"):
        asyncio.run(client.search("q"))
    assert requests == []


def _raise_connect(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("unreachable", request=request)


@pytest.mark.parametrize(
    ("handler", "message"),
    [
        (lambda _: httpx.Response(401, json={}), "search failed"),
        (lambda _: httpx.Response(503), "search failed"),
        (_raise_connect, "search failed"),
        (lambda _: httpx.Response(200, content=b"<html>"), "not valid JSON"),
        (lambda _: httpx.Response(200, json={"results": ["not an object"]}), "unexpected shape"),
        (lambda _: httpx.Response(200, json=["not an object"]), "unexpected shape"),
    ],
)
def test_provider_failures_raise_the_typed_error(search_with, handler, message):
    client, _ = search_with(handler)
    with pytest.raises(WebSearchUnavailableError, match=message):
        asyncio.run(client.search("q"))
