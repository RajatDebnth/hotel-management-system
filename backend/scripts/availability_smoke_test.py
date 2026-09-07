"""Verify live overlap semantics with disposable Supabase records."""

import asyncio
import secrets
import sys
from datetime import date, timedelta
from uuid import uuid4

import httpx
import psycopg
from dotenv import dotenv_values
from fastapi.testclient import TestClient

from app.main import app


def available_slugs(client: TestClient, check_in: date, check_out: date) -> set[str]:
    response = client.get(
        "/api/v1/catalog/availability",
        params={"check_in": check_in, "check_out": check_out, "guests": 2},
    )
    response.raise_for_status()
    return {item["slug"] for item in response.json()["items"]}


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    config = dotenv_values(".env")
    base_url = str(config["SUPABASE_URL"]).rstrip("/")
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    database_url = str(config["DATABASE_URL"]).replace(
        "postgresql+psycopg://", "postgresql://", 1
    )
    email = f"codex-availability-{uuid4().hex}@example.com"
    password = f"Hms!{secrets.token_urlsafe(24)}"
    headers = {"apikey": secret_key, "Authorization": f"Bearer {secret_key}"}
    user_id: str | None = None
    booking_id: str | None = None
    check_in = date.today() + timedelta(days=60)
    check_out = check_in + timedelta(days=2)

    try:
        created = httpx.post(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            json={"email": email, "password": password, "email_confirm": True},
            timeout=30,
        )
        created.raise_for_status()
        user_id = created.json()["id"]

        with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                insert into public.bookings (
                  booking_reference, user_id, room_id, check_in, check_out,
                  guest_name, guest_email, guest_phone, price_per_night,
                  night_count, subtotal, tax_amount, total_amount, status
                ) values (
                  %s, %s, '30000000-0000-0000-0000-000000000102', %s, %s,
                  'Availability Smoke', %s, '+910000000000', 4400, 2, 8800, 0, 8800, 'pending'
                ) returning id
                """,
                (f"HMS-{uuid4().hex[:12].upper()}", user_id, check_in, check_out, email),
            )
            booking_id = str(cursor.fetchone()[0])

        with TestClient(app) as client:
            assert "garden-twin" not in available_slugs(client, check_in, check_out)
            assert "garden-twin" in available_slugs(
                client, check_out, check_out + timedelta(days=1)
            )

            with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
                cursor.execute(
                    "update public.bookings set status = 'cancelled' where id = %s",
                    (booking_id,),
                )
            assert "garden-twin" in available_slugs(client, check_in, check_out)

            with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
                cursor.execute(
                    "update public.bookings set status = 'rejected' where id = %s",
                    (booking_id,),
                )
            assert "garden-twin" in available_slugs(client, check_in, check_out)

        print("active_overlap_blocks_room: passed")
        print("back_to_back_boundary_available: passed")
        print("cancelled_and_rejected_do_not_block: passed")
    finally:
        if booking_id:
            with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
                cursor.execute("delete from public.bookings where id = %s", (booking_id,))
        if user_id:
            deleted = httpx.delete(
                f"{base_url}/auth/v1/admin/users/{user_id}", headers=headers, timeout=30
            )
            deleted.raise_for_status()
        print("disposable_availability_records_cleanup: passed")


if __name__ == "__main__":
    main()
