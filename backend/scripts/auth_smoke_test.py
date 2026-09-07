"""Exercise hosted Supabase Auth and FastAPI guards with a disposable user."""

import asyncio
import secrets
import sys
from uuid import uuid4

import httpx
import psycopg
from dotenv import dotenv_values
from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    config = dotenv_values(".env")
    base_url = str(config["SUPABASE_URL"]).rstrip("/")
    publishable_key = str(config["SUPABASE_PUBLISHABLE_KEY"])
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    database_url = str(config["DATABASE_URL"]).replace(
        "postgresql+psycopg://", "postgresql://", 1
    )
    email = f"codex-auth-smoke-{uuid4().hex}@example.com"
    password = f"Hms!{secrets.token_urlsafe(24)}"
    admin_headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
    }
    user_id: str | None = None

    try:
        create_response = httpx.post(
            f"{base_url}/auth/v1/admin/users",
            headers=admin_headers,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": "Disposable Auth Test"},
            },
            timeout=30,
        )
        create_response.raise_for_status()
        user_id = create_response.json()["id"]

        token_response = httpx.post(
            f"{base_url}/auth/v1/token?grant_type=password",
            headers={"apikey": publishable_key},
            json={"email": email, "password": password},
            timeout=30,
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]

        with TestClient(app) as client:
            user_response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_response.raise_for_status()
            assert user_response.json()["role"] == "customer"

            with (
                psycopg.connect(database_url) as connection,
                connection.cursor() as cursor,
            ):
                cursor.execute(
                    "update public.profiles set role = 'admin' where id = %s",
                    (user_id,),
                )

            admin_response = client.get(
                "/api/v1/auth/admin-check",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            admin_response.raise_for_status()
            assert admin_response.json()["role"] == "admin"

        print("hosted_signup: passed")
        print("password_signin: passed")
        print("profile_trigger: passed")
        print("fastapi_jwt_verification: passed")
        print("customer_and_admin_guards: passed")
    finally:
        if user_id:
            delete_response = httpx.delete(
                f"{base_url}/auth/v1/admin/users/{user_id}",
                headers=admin_headers,
                timeout=30,
            )
            delete_response.raise_for_status()
            print("disposable_user_cleanup: passed")


if __name__ == "__main__":
    main()
