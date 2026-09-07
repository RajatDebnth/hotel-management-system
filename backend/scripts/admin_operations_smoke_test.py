"""Verify admin booking/enquiry queues, transitions, history, and access control."""

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
    service_headers = {"apikey": secret_key, "Authorization": f"Bearer {secret_key}"}
    api = "http://localhost:8000/api/v1"
    password = f"Hms!{secrets.token_urlsafe(24)}"
    users: list[str] = []
    booking_id: str | None = None
    enquiry_id: str | None = None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            tokens: list[str] = []
            for role in ("admin", "customer"):
                email = f"codex-operations-{role}-{uuid4().hex}@example.com"
                created = await client.post(
                    f"{base_url}/auth/v1/admin/users",
                    headers=service_headers,
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": f"Operations {role.title()}"},
                    },
                )
                created.raise_for_status()
                user_id = created.json()["id"]
                users.append(user_id)
                if role == "admin":
                    promoted = await client.patch(
                        f"{base_url}/rest/v1/profiles",
                        headers={**service_headers, "Content-Type": "application/json"},
                        params={"id": f"eq.{user_id}"},
                        json={"role": "admin"},
                    )
                    promoted.raise_for_status()
                signed_in = await client.post(
                    f"{base_url}/auth/v1/token?grant_type=password",
                    headers={"apikey": secret_key},
                    json={"email": email, "password": password},
                )
                signed_in.raise_for_status()
                tokens.append(signed_in.json()["access_token"])

            admin_headers = {"Authorization": f"Bearer {tokens[0]}"}
            customer_headers = {"Authorization": f"Bearer {tokens[1]}"}
            check_in = date.today() + timedelta(days=150)
            booking = await client.post(
                f"{api}/bookings",
                headers=customer_headers,
                json={
                    "category_id": "10000000-0000-0000-0000-000000000003",
                    "check_in": check_in.isoformat(),
                    "check_out": (check_in + timedelta(days=2)).isoformat(),
                    "adult_count": 1,
                    "child_count": 0,
                    "guest_name": "Operations Smoke",
                    "guest_email": "operations-smoke@example.com",
                    "guest_phone": "+910000000000",
                },
            )
            booking.raise_for_status()
            booking_id = booking.json()["id"]
            enquiry = await client.post(
                f"{api}/enquiries",
                json={
                    "name": "Operations Smoke",
                    "email": "operations-smoke@example.com",
                    "subject": "Late arrival question",
                    "message": "This disposable enquiry tests the operations queue.",
                },
            )
            enquiry.raise_for_status()
            enquiry_id = enquiry.json()["id"]

            denied = await client.get(
                f"{api}/admin/operations/bookings", headers=customer_headers
            )
            assert denied.status_code == 403
            booking_queue = await client.get(
                f"{api}/admin/operations/bookings",
                headers=admin_headers,
                params={"q": "Operations Smoke", "status": "pending"},
            )
            booking_queue.raise_for_status()
            assert [item["id"] for item in booking_queue.json()["items"]] == [booking_id]
            enquiry_queue = await client.get(
                f"{api}/admin/operations/enquiries",
                headers=admin_headers,
                params={"q": "Late arrival", "status": "new"},
            )
            enquiry_queue.raise_for_status()
            assert [item["id"] for item in enquiry_queue.json()["items"]] == [enquiry_id]

            invalid = await client.patch(
                f"{api}/admin/operations/bookings/{booking_id}/status",
                headers=admin_headers,
                json={"status": "checked_out", "reason": "Invalid shortcut"},
            )
            assert invalid.status_code == 409
            confirmed = await client.patch(
                f"{api}/admin/operations/bookings/{booking_id}/status",
                headers=admin_headers,
                json={"status": "confirmed", "reason": "Availability verified"},
            )
            confirmed.raise_for_status()
            assert confirmed.json()["status"] == "confirmed"

            handled = await client.patch(
                f"{api}/admin/operations/enquiries/{enquiry_id}",
                headers=admin_headers,
                json={
                    "status": "resolved",
                    "assigned_to": users[0],
                    "admin_notes": "Guest contacted by phone.",
                },
            )
            handled.raise_for_status()
            assert handled.json()["assigned_to"] == users[0]

            history = await client.get(
                f"{base_url}/rest/v1/booking_status_history",
                headers=service_headers,
                params={"booking_id": f"eq.{booking_id}", "select": "to_status,changed_by,reason"},
            )
            history.raise_for_status()
            assert [item["to_status"] for item in history.json()] == ["pending", "confirmed"]
            assert history.json()[-1]["changed_by"] == users[0]

        print("admin_queues_search_filter_and_customer_denial: passed")
        print("invalid_transition_rejected_and_valid_history_recorded: passed")
        print("enquiry_assignment_notes_and_resolution: passed")
    finally:
        async with httpx.AsyncClient(timeout=30) as client:
            if booking_id:
                response = await client.delete(
                    f"{base_url}/rest/v1/bookings",
                    headers=service_headers,
                    params={"id": f"eq.{booking_id}"},
                )
                response.raise_for_status()
            if enquiry_id:
                response = await client.delete(
                    f"{base_url}/rest/v1/enquiries",
                    headers=service_headers,
                    params={"id": f"eq.{enquiry_id}"},
                )
                response.raise_for_status()
            for user_id in users:
                response = await client.delete(
                    f"{base_url}/auth/v1/admin/users/{user_id}", headers=service_headers
                )
                response.raise_for_status()
        print("disposable_operations_records_cleanup: passed")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
