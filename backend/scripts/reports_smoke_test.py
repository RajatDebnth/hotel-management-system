"""Verify dashboard and report values against one controlled booking fixture."""

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
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    service_headers = {
        "apikey": secret_key,
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }
    password = f"Hms!{secrets.token_urlsafe(24)}"
    user_ids: list[str] = []
    booking_id: str | None = None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            tokens: list[str] = []
            for role in ("admin", "customer"):
                email = f"codex-reports-{role}-{uuid4().hex}@example.com"
                created = await client.post(
                    f"{base_url}/auth/v1/admin/users",
                    headers=service_headers,
                    json={"email": email, "password": password, "email_confirm": True},
                )
                created.raise_for_status()
                user_id = created.json()["id"]
                user_ids.append(user_id)
                if role == "admin":
                    promoted = await client.patch(
                        f"{base_url}/rest/v1/profiles",
                        headers=service_headers,
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

            start = date.today() + timedelta(days=300)
            end = start + timedelta(days=3)
            inserted = await client.post(
                f"{base_url}/rest/v1/bookings",
                headers={**service_headers, "Prefer": "return=representation"},
                json={
                    "booking_reference": f"HMS-{uuid4().hex[:12].upper()}",
                    "user_id": user_ids[1],
                    "room_id": "30000000-0000-0000-0000-000000000102",
                    "check_in": start.isoformat(),
                    "check_out": (start + timedelta(days=2)).isoformat(),
                    "adult_count": 1,
                    "child_count": 0,
                    "guest_name": "Report Fixture",
                    "guest_email": "report-fixture@example.com",
                    "guest_phone": "+910000000000",
                    "price_per_night": 100,
                    "night_count": 2,
                    "subtotal": 200,
                    "tax_amount": 0,
                    "total_amount": 200,
                    "status": "confirmed",
                },
            )
            inserted.raise_for_status()
            booking_id = inserted.json()[0]["id"]
            headers = {"Authorization": f"Bearer {tokens[0]}"}
            params = {"start_date": start.isoformat(), "end_date": end.isoformat()}
            occupancy = await client.get(
                "http://localhost:8000/api/v1/admin/reports/occupancy",
                headers=headers,
                params=params,
            )
            occupancy.raise_for_status()
            report = occupancy.json()
            assert report["available_room_nights"] == 12
            assert report["occupied_room_nights"] == 2
            assert Decimal(str(report["occupancy_percentage"])) == Decimal("16.67")
            assert [day["occupied_rooms"] for day in report["days"]] == [1, 1, 0]

            revenue = await client.get(
                "http://localhost:8000/api/v1/admin/reports/revenue",
                headers=headers,
                params=params,
            )
            revenue.raise_for_status()
            assert Decimal(str(revenue.json()["booked_revenue"])) == Decimal("200.00")
            assert [Decimal(str(day["booked_revenue"])) for day in revenue.json()["days"]] == [
                Decimal("100.00"), Decimal("100.00"), Decimal("0.00")
            ]

            summary = await client.get(
                "http://localhost:8000/api/v1/admin/dashboard/summary",
                headers=headers,
                params={"report_date": start.isoformat()},
            )
            summary.raise_for_status()
            assert summary.json()["occupied_rooms"] == 1
            assert summary.json()["arrivals"] == 1

        print("controlled_occupancy_room_nights_and_boundaries: passed")
        print("immutable_snapshot_booked_revenue: passed")
        print("dashboard_occupied_and_arrival_metrics: passed")
    finally:
        async with httpx.AsyncClient(timeout=30) as client:
            if booking_id:
                deleted = await client.delete(
                    f"{base_url}/rest/v1/bookings",
                    headers=service_headers,
                    params={"id": f"eq.{booking_id}"},
                )
                deleted.raise_for_status()
            for user_id in user_ids:
                deleted = await client.delete(
                    f"{base_url}/auth/v1/admin/users/{user_id}", headers=service_headers
                )
                deleted.raise_for_status()
        print("disposable_report_records_cleanup: passed")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
