from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.auth import LocalSessionManager, get_or_create_signing_key, get_session_manager
from app.core.passwords import hash_password, verify_password
from app.db.schema import initialize_database
from app.db.session import build_engine, get_db_session
from app.main import app
from app.schemas.auth import AuthenticatedUser

FRONTEND_ORIGIN = "http://localhost:3000"
ADMIN_PASSWORD = "TestAdminPassword!23"
CUSTOMER_PASSWORD = "CustomerPassword!23"
NEW_CUSTOMER_PASSWORD = "ChangedPassword!45"


def test_password_hashes_are_salted_and_verified() -> None:
    first = hash_password(CUSTOMER_PASSWORD)
    second = hash_password(CUSTOMER_PASSWORD)

    assert first != second
    assert CUSTOMER_PASSWORD not in first
    assert verify_password(CUSTOMER_PASSWORD, first)
    assert not verify_password("wrong-password", first)
    assert not verify_password(CUSTOMER_PASSWORD, "malformed")


def test_signing_key_is_created_once_and_remains_private(tmp_path: Path) -> None:
    path = tmp_path / "data" / ".session-key"

    first = get_or_create_signing_key(path)
    second = get_or_create_signing_key(path)

    assert first == second
    assert len(first) >= 32
    assert path.read_text(encoding="utf-8") == first


@pytest.mark.asyncio
async def test_local_auth_sessions_passwords_csrf_and_roles(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    manager = LocalSessionManager("test-signing-key-that-is-long-enough-for-hs256")
    await initialize_database(engine, admin_password=ADMIN_PASSWORD)

    async def session_override() -> AsyncIterator[AsyncSession]:
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db_session] = session_override
    app.dependency_overrides[get_session_manager] = lambda: manager
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            register = await client.post(
                "/api/v1/auth/register",
                headers={"Origin": FRONTEND_ORIGIN},
                json={
                    "full_name": "Local Customer",
                    "email": "customer@example.com",
                    "password": CUSTOMER_PASSWORD,
                },
            )
            assert register.status_code == 201
            customer_id = register.json()["id"]
            cookie = register.headers["set-cookie"].lower()
            assert "httponly" in cookie
            assert "samesite=lax" in cookie
            assert CUSTOMER_PASSWORD not in register.text

            identity = await client.get("/api/v1/auth/me")
            assert identity.status_code == 200
            assert identity.json()["role"] == "customer"

            duplicate = await client.post(
                "/api/v1/auth/register",
                headers={"Origin": FRONTEND_ORIGIN},
                json={
                    "full_name": "Duplicate",
                    "email": "CUSTOMER@example.com",
                    "password": CUSTOMER_PASSWORD,
                },
            )
            assert duplicate.status_code == 409

            forbidden_admin = await client.get("/api/v1/admin/users")
            assert forbidden_admin.status_code == 403

            missing_origin = await client.post(
                "/api/v1/auth/password",
                json={
                    "current_password": CUSTOMER_PASSWORD,
                    "new_password": NEW_CUSTOMER_PASSWORD,
                },
            )
            assert missing_origin.status_code == 403

            wrong_password = await client.post(
                "/api/v1/auth/password",
                headers={"Origin": FRONTEND_ORIGIN},
                json={
                    "current_password": "incorrect-password",
                    "new_password": NEW_CUSTOMER_PASSWORD,
                },
            )
            assert wrong_password.status_code == 400

            changed = await client.post(
                "/api/v1/auth/password",
                headers={"Origin": FRONTEND_ORIGIN},
                json={
                    "current_password": CUSTOMER_PASSWORD,
                    "new_password": NEW_CUSTOMER_PASSWORD,
                },
            )
            assert changed.status_code == 204

            cross_site = await client.post(
                "/api/v1/auth/logout", headers={"Origin": "https://attacker.example"}
            )
            assert cross_site.status_code == 403

            logout = await client.post(
                "/api/v1/auth/logout", headers={"Origin": FRONTEND_ORIGIN}
            )
            assert logout.status_code == 204
            assert (await client.get("/api/v1/auth/me")).status_code == 401

            old_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "customer@example.com", "password": CUSTOMER_PASSWORD},
            )
            assert old_login.status_code == 401
            new_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "customer@example.com", "password": NEW_CUSTOMER_PASSWORD},
            )
            assert new_login.status_code == 200
            await client.post("/api/v1/auth/logout", headers={"Origin": FRONTEND_ORIGIN})

            admin_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
            )
            assert admin_login.status_code == 200
            users = await client.get("/api/v1/admin/users")
            assert users.status_code == 200
            assert {item["email"] for item in users.json()} == {
                "admin@example.com",
                "customer@example.com",
            }

            self_change = await client.patch(
                f"/api/v1/admin/users/{admin_login.json()['id']}/role",
                headers={"Origin": FRONTEND_ORIGIN},
                json={"role": "customer"},
            )
            assert self_change.status_code == 409

            promoted = await client.patch(
                f"/api/v1/admin/users/{customer_id}/role",
                headers={"Origin": FRONTEND_ORIGIN},
                json={"role": "admin"},
            )
            assert promoted.status_code == 200
            assert promoted.json()["role"] == "admin"

        expired_manager = LocalSessionManager(
            "test-signing-key-that-is-long-enough-for-hs256", lifetime_minutes=1
        )
        expired_user = AuthenticatedUser(
            id=customer_id, email="customer@example.com", role="admin"
        )
        expired_token = expired_manager.create(
            expired_user, now=datetime.now(UTC) - timedelta(minutes=2)
        )
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            client.cookies.set("hms_session", expired_token)
            expired = await client.get("/api/v1/auth/me")
            assert expired.status_code == 401
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()
