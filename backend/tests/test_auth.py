from uuid import UUID

from fastapi.testclient import TestClient

from app.core.auth import get_jwt_verifier, require_user
from app.main import app
from app.schemas.auth import AuthenticatedUser

CUSTOMER_ID = UUID("40000000-0000-0000-0000-000000000001")
ADMIN_ID = UUID("40000000-0000-0000-0000-000000000002")


def customer() -> AuthenticatedUser:
    return AuthenticatedUser(id=CUSTOMER_ID, email="customer@example.com", role="customer")


def admin() -> AuthenticatedUser:
    return AuthenticatedUser(id=ADMIN_ID, email="admin@example.com", role="admin")


def test_missing_bearer_token_is_unauthorized() -> None:
    class VerifierThatMustNotRun:
        async def verify(self, token: str) -> None:
            raise AssertionError(f"Verifier unexpectedly received {token}")

    app.dependency_overrides[get_jwt_verifier] = VerifierThatMustNotRun
    try:
        response = TestClient(app).get("/api/v1/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_customer_can_read_authenticated_identity() -> None:
    app.dependency_overrides[require_user] = customer
    try:
        response = TestClient(app).get("/api/v1/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == "customer"


def test_customer_cannot_access_admin_endpoint() -> None:
    app.dependency_overrides[require_user] = customer
    try:
        response = TestClient(app).get("/api/v1/auth/admin-check")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json() == {"detail": "Administrator access required"}


def test_admin_can_access_admin_endpoint() -> None:
    app.dependency_overrides[require_user] = admin
    try:
        response = TestClient(app).get("/api/v1/auth/admin-check")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == "admin"

