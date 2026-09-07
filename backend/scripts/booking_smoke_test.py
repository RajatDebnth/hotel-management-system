"""Verify transactional booking and overlap handling against the configured project."""

import asyncio
import secrets
import sys
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import httpx
from dotenv import dotenv_values


async def main() -> None:
    config = dotenv_values(".env")
    base_url = str(config["SUPABASE_URL"]).rstrip("/")
    api_url = str(config.get("API_URL") or "http://localhost:8000").rstrip("/")
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    admin_headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "return=minimal",
    }
    password = f"Hms!{secrets.token_urlsafe(24)}"
    user_ids: list[str] = []
    tokens: list[str] = []
    check_in = date.today() + timedelta(days=90)
    check_out = check_in + timedelta(days=2)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            existing = await client.get(
                f"{base_url}/auth/v1/admin/users?page=1&per_page=1000",
                headers=admin_headers,
            )
            existing.raise_for_status()
            stale_ids = [
                user["id"] for user in existing.json().get("users", [])
                if str(user.get("email", "")).startswith("codex-booking-")
            ]
            if stale_ids:
                deleted_bookings = await client.delete(
                    f"{base_url}/rest/v1/bookings",
                    headers=admin_headers,
                    params={"user_id": f"in.({','.join(stale_ids)})"},
                )
                deleted_bookings.raise_for_status()
                for stale_id in stale_ids:
                    deleted = await client.delete(
                        f"{base_url}/auth/v1/admin/users/{stale_id}", headers=admin_headers
                    )
                    deleted.raise_for_status()
            for _ in range(2):
                email = f"codex-booking-{uuid4().hex}@example.com"
                created = await client.post(
                    f"{base_url}/auth/v1/admin/users",
                    headers=admin_headers,
                    json={"email": email, "password": password, "email_confirm": True},
                )
                created.raise_for_status()
                user_ids.append(created.json()["id"])
                signed_in = await client.post(
                    f"{base_url}/auth/v1/token?grant_type=password",
                    headers={"apikey": secret_key},
                    json={"email": email, "password": password},
                )
                signed_in.raise_for_status()
                tokens.append(signed_in.json()["access_token"])

            payload = {
                "category_id": "10000000-0000-0000-0000-000000000002",
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "adult_count": 2,
                "child_count": 0,
                "guest_name": "Booking Smoke",
                "guest_email": "smoke@example.com",
                "guest_phone": "+910000000000",
            }
            responses = await asyncio.gather(*[
                client.post(
                    f"{api_url}/api/v1/bookings",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload,
                )
                for token in tokens
            ])
            codes = sorted(response.status_code for response in responses)
            assert codes == [201, 409], codes
            successful = next(response for response in responses if response.status_code == 201)
            booking = successful.json()
            assert booking["night_count"] == 2
            expected_total = Decimal(str(booking["price_per_night"])) * 2
            assert Decimal(str(booking["subtotal"])) == expected_total
            assert Decimal(str(booking["total_amount"])) == expected_total
            assert booking["status"] == "pending"

        async with httpx.AsyncClient(timeout=30) as client:
            history = await client.get(
                f"{base_url}/rest/v1/booking_status_history",
                headers=admin_headers,
                params={"booking_id": f"eq.{booking['id']}", "select": "from_status,to_status"},
            )
            history.raise_for_status()
            assert history.json() == [{"from_status": None, "to_status": "pending"}]

        print("valid_booking_and_price_snapshot: passed")
        print("simultaneous_overlap_allows_exactly_one_booking: passed")
        print("initial_status_history: passed")
    finally:
        if user_ids:
            async with httpx.AsyncClient(timeout=30) as client:
                deleted_bookings = await client.delete(
                    f"{base_url}/rest/v1/bookings",
                    headers=admin_headers,
                    params={"user_id": f"in.({','.join(user_ids)})"},
                )
                deleted_bookings.raise_for_status()
                for user_id in user_ids:
                    response = await client.delete(
                        f"{base_url}/auth/v1/admin/users/{user_id}", headers=admin_headers
                    )
                    response.raise_for_status()
        print("disposable_booking_records_cleanup: passed")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
