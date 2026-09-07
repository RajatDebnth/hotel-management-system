from collections.abc import AsyncIterator
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.auth import require_user
from app.db.session import get_db_session
from app.main import app
from app.schemas.auth import AuthenticatedUser


class RowResult:
    def mappings(self) -> "RowResult":
        return self

    def one(self) -> dict[str, object]:
        return {
            "id": UUID("40000000-0000-0000-0000-000000000001"),
            "full_name": "Updated Guest",
            "phone": "+91 98765 43210",
            "avatar_path": None,
            "role": "customer",
        }


class ProfileSession:
    def __init__(self) -> None:
        self.values: dict[str, object] = {}
        self.committed = False

    async def execute(self, statement: object, values: dict[str, object]) -> RowResult:
        self.values = values
        return RowResult()

    async def commit(self) -> None:
        self.committed = True


async def customer() -> AuthenticatedUser:
    return AuthenticatedUser(
        id=UUID("40000000-0000-0000-0000-000000000001"),
        email="guest@example.com",
        role="customer",
    )


def test_profile_update_cannot_change_role_or_email() -> None:
    session = ProfileSession()

    async def session_override() -> AsyncIterator[ProfileSession]:
        yield session

    app.dependency_overrides[require_user] = customer
    app.dependency_overrides[get_db_session] = session_override
    try:
        response = TestClient(app).patch(
            "/api/v1/me",
            json={
                "full_name": "Updated Guest",
                "phone": "+91 98765 43210",
                "role": "admin",
                "email": "attacker@example.com",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == "customer"
    assert response.json()["email"] == "guest@example.com"
    assert "role" not in session.values
    assert "email" not in session.values
    assert session.committed
