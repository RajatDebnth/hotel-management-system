"""Verify customer ownership, profile updates, and cancellation against Supabase."""

import asyncio
import secrets
import sys
from datetime import date, timedelta
from uuid import uuid4

import httpx
from dotenv import dotenv_values


async def main() -> None:
    config = dotenv_values(".env")
    base_url = str(config["SUPABASE_URL"]).rstrip("/")
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    admin_headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Prefer": "return=minimal",
    }
    password = f"Hms!{secrets.token_urlsafe(24)}"
    users: list[dict[str, str]] = []
    reference: str | None = None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            for number in range(2):
                email = f"codex-account-{uuid4().hex}@example.com"
                created = await client.post(
                    f"{base_url}/auth/v1/admin/users",
                    headers=admin_headers,
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": f"Account Guest {number + 1}"},
                    },
                )
                created.raise_for_status()
                signed_in = await client.post(
                    f"{base_url}/auth/v1/token?grant_type=password",
                    headers={"apikey": secret_key},
                    json={"email": email, "password": password},
                )
                signed_in.raise_for_status()
                users.append({
                    "id": created.json()["id"],
                    "token": signed_in.json()["access_token"],
                })

            api = "http://localhost:8000/api/v1"
            first_headers = {"Authorization": f"Bearer {users[0]['token']}"}
            second_headers = {"Authorization": f"Bearer {users[1]['token']}"}
            start = date.today() + timedelta(days=120)
            created_booking = await client.post(
                f"{api}/bookings",
                headers=first_headers,
                json={
                    "category_id": "10000000-0000-0000-0000-000000000003",
                    "check_in": start.isoformat(),
                    "check_out": (start + timedelta(days=2)).isoformat(),
                    "adult_count": 1,
                    "child_count": 0,
                    "guest_name": "Account Smoke",
                    "guest_email": "account-smoke@example.com",
                    "guest_phone": "+910000000000",
                },
            )
            created_booking.raise_for_status()
            reference = created_booking.json()["booking_reference"]

            own_list = await client.get(f"{api}/bookings", headers=first_headers)
            own_list.raise_for_status()
            assert [item["booking_reference"] for item in own_list.json()["items"]] == [reference]
            cross_user = await client.get(f"{api}/bookings/{reference}", headers=second_headers)
            assert cross_user.status_code == 404

            updated = await client.patch(
                f"{api}/me",
                headers=first_headers,
                json={
                    "full_name": "Updated Account Guest",
                    "phone": "+91 98765 43210",
                    "role": "admin",
                },
            )
            updated.raise_for_status()
            assert updated.json()["full_name"] == "Updated Account Guest"
            assert updated.json()["role"] == "customer"

            cancelled = await client.post(
                f"{api}/bookings/{reference}/cancel",
                headers=first_headers,
                json={"reason": "Automated account smoke test"},
            )
            cancelled.raise_for_status()
            assert cancelled.json()["status"] == "cancelled"

            history = await client.get(
                f"{base_url}/rest/v1/booking_status_history",
                headers=admin_headers,
                params={"booking_id": f"eq.{created_booking.json()['id']}", "select": "to_status"},
            )
            history.raise_for_status()
            assert [item["to_status"] for item in history.json()] == ["pending", "cancelled"]

        print("own_booking_visible_and_cross_user_hidden: passed")
        print("profile_update_cannot_promote_role: passed")
        print("cancellation_and_status_history: passed")
    finally:
        if users:
            async with httpx.AsyncClient(timeout=30) as client:
                ids = [user["id"] for user in users]
                deleted = await client.delete(
                    f"{base_url}/rest/v1/bookings",
                    headers=admin_headers,
                    params={"user_id": f"in.({','.join(ids)})"},
                )
                deleted.raise_for_status()
                for user in users:
                    response = await client.delete(
                        f"{base_url}/auth/v1/admin/users/{user['id']}", headers=admin_headers
                    )
                    response.raise_for_status()
        print("disposable_account_records_cleanup: passed")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
