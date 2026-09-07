from fastapi.testclient import TestClient

from app.core.middleware import SlidingWindowLimiter
from app.main import app


def test_sliding_window_limiter_releases_expired_requests() -> None:
    limiter = SlidingWindowLimiter(limit=2, window_seconds=10)

    assert limiter.allow("client", now=0)
    assert limiter.allow("client", now=1)
    assert not limiter.allow("client", now=2)
    assert limiter.allow("client", now=11)


def test_api_security_headers_and_request_id() -> None:
    response = TestClient(app).get(
        "/api/v1/health", headers={"X-Request-ID": "release-check-123"}
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "release-check-123"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["cache-control"] == "no-store"


def test_invalid_request_id_is_replaced() -> None:
    response = TestClient(app).get("/api/v1/health", headers={"X-Request-ID": "invalid id!"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] != "invalid id!"
    assert len(response.headers["x-request-id"]) == 32
