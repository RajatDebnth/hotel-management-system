"""Exercise the complete live local API against the realistic acceptance dataset."""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

API_URL = os.getenv("REALISTIC_API_URL", "http://127.0.0.1:8000").rstrip("/")
SITE_URL = os.getenv("REALISTIC_SITE_URL", "http://localhost:3000")
ADMIN_EMAIL = "admin@example.com"
CUSTOMER_EMAIL = "arjun.mehta@example.com"


def require(response: httpx.Response, status_code: int, action: str) -> httpx.Response:
    if response.status_code != status_code:
        raise RuntimeError(
            f"{action} returned {response.status_code}, expected {status_code}: "
            f"{response.text[:500]}"
        )
    print(f"PASS {action}")
    return response


def login(client: httpx.Client, email: str, password: str, action: str) -> dict[str, Any]:
    return require(
        client.post("/api/v1/auth/login", json={"email": email, "password": password}),
        200,
        action,
    ).json()


def main() -> int:
    admin_password = os.getenv("REALISTIC_ADMIN_PASSWORD")
    customer_password = os.getenv("REALISTIC_CUSTOMER_PASSWORD")
    if not admin_password or not customer_password:
        raise SystemExit(
            "REALISTIC_ADMIN_PASSWORD and REALISTIC_CUSTOMER_PASSWORD are required"
        )

    common_headers = {"Origin": SITE_URL}
    with httpx.Client(
        base_url=API_URL,
        headers=common_headers,
        timeout=30,
        follow_redirects=True,
    ) as public:
        require(public.get("/api/v1/health"), 200, "health endpoint")
        catalog = require(
            public.get("/api/v1/catalog/rooms", params={"page_size": 20}),
            200,
            "public catalog",
        ).json()
        if catalog["total"] != 3:
            raise RuntimeError(f"Expected 3 room categories, found {catalog['total']}")
        require(public.get("/api/v1/catalog/rooms/deluxe-king"), 200, "room detail")
        facilities = require(
            public.get("/api/v1/catalog/facilities"), 200, "public facilities"
        ).json()
        if len(facilities) != 6:
            raise RuntimeError(f"Expected 6 facilities, found {len(facilities)}")
        search_in = date.today() + timedelta(days=120)
        search_out = search_in + timedelta(days=2)
        available = require(
            public.get(
                "/api/v1/catalog/availability",
                params={
                    "check_in": search_in.isoformat(),
                    "check_out": search_out.isoformat(),
                    "guests": 2,
                },
            ),
            200,
            "availability search",
        ).json()
        if not available["items"]:
            raise RuntimeError("Availability search returned no rooms")
        require(
            public.get("/api/v1/admin/dashboard/summary"),
            401,
            "anonymous administrator denial",
        )

    with httpx.Client(
        base_url=API_URL,
        headers=common_headers,
        timeout=30,
        follow_redirects=True,
    ) as customer:
        customer_identity = login(
            customer,
            CUSTOMER_EMAIL,
            customer_password,
            "customer login",
        )
        require(customer.get("/api/v1/auth/me"), 200, "customer session restoration")
        require(customer.get("/api/v1/me"), 200, "customer profile read")
        require(
            customer.patch(
                "/api/v1/me",
                json={"full_name": "Arjun Mehta", "phone": "9000000001"},
            ),
            200,
            "customer profile update",
        )
        require(
            customer.get("/api/v1/admin/users"),
            403,
            "customer administrator denial",
        )
        existing_booking_page = require(
            customer.get("/api/v1/bookings"), 200, "customer booking list"
        ).json()
        existing_bookings = existing_booking_page["items"]
        if not existing_bookings:
            raise RuntimeError("Customer has no seeded reservation")
        require(
            customer.get(f"/api/v1/bookings/{existing_bookings[0]['booking_reference']}"),
            200,
            "customer booking detail",
        )

        booking_in = date.today() + timedelta(days=120)
        booking_out = booking_in + timedelta(days=2)
        created_booking = require(
            customer.post(
                "/api/v1/bookings",
                json={
                    "category_id": catalog["items"][0]["id"],
                    "check_in": booking_in.isoformat(),
                    "check_out": booking_out.isoformat(),
                    "adult_count": 2,
                    "child_count": 0,
                    "guest_name": "Arjun Mehta",
                    "guest_email": CUSTOMER_EMAIL,
                    "guest_phone": "9000000001",
                    "special_requests": "Please reserve a quiet room away from the lift.",
                },
            ),
            201,
            "customer booking creation",
        ).json()
        require(
            customer.post(
                f"/api/v1/bookings/{created_booking['booking_reference']}/cancel",
                json={"reason": "Travel dates changed after confirmation from the office."},
            ),
            200,
            "customer booking cancellation",
        )
        require(
            customer.post(
                "/api/v1/enquiries",
                json={
                    "name": "Arjun Mehta",
                    "email": CUSTOMER_EMAIL,
                    "phone": "9000000001",
                    "subject": "Conference room availability",
                    "message": "Please share availability for a small six-person meeting.",
                    "website": "",
                },
            ),
            201,
            "signed-in customer enquiry",
        )
        if customer_identity["role"] != "customer":
            raise RuntimeError("Customer login returned an unexpected role")

    with httpx.Client(
        base_url=API_URL,
        headers=common_headers,
        timeout=30,
        follow_redirects=True,
    ) as admin:
        admin_identity = login(admin, ADMIN_EMAIL, admin_password, "administrator login")
        require(admin.get("/api/v1/auth/admin-check"), 200, "administrator role check")
        users = require(admin.get("/api/v1/admin/users"), 200, "administrator user list").json()
        customer_users = [user for user in users if user["role"] == "customer"]
        if len(customer_users) != 20:
            raise RuntimeError(f"Expected 20 customers, found {len(customer_users)}")
        target = next(user for user in users if user["email"] == "riya.sen@example.com")
        require(
            admin.patch(
                f"/api/v1/admin/users/{target['id']}/role", json={"role": "admin"}
            ),
            200,
            "administrator role promotion",
        )
        require(
            admin.patch(
                f"/api/v1/admin/users/{target['id']}/role", json={"role": "customer"}
            ),
            200,
            "administrator role restoration",
        )

        inventory = require(
            admin.get("/api/v1/admin/inventory"), 200, "administrator inventory read"
        ).json()
        category = require(
            admin.post(
                "/api/v1/admin/inventory/categories",
                json={
                    "name": "Courtyard Studio",
                    "slug": "courtyard-studio",
                    "description": "Acceptance-run category for complete CRUD verification.",
                    "base_price": "6100.00",
                    "max_guests": 2,
                    "bed_type": "Queen",
                    "room_size_sq_m": "35.0",
                    "is_active": True,
                },
            ),
            201,
            "administrator category creation",
        ).json()
        require(
            admin.put(
                f"/api/v1/admin/inventory/categories/{category['id']}",
                json={
                    "name": "Courtyard Studio",
                    "slug": "courtyard-studio",
                    "description": "Updated courtyard studio used for acceptance verification.",
                    "base_price": "6250.00",
                    "max_guests": 2,
                    "bed_type": "Queen",
                    "room_size_sq_m": "35.0",
                    "is_active": True,
                },
            ),
            200,
            "administrator category update",
        )
        room = require(
            admin.post(
                "/api/v1/admin/inventory/rooms",
                json={
                    "room_number": "401",
                    "category_id": category["id"],
                    "floor": 4,
                    "description": "Temporary acceptance room with courtyard view.",
                    "status": "active",
                },
            ),
            201,
            "administrator room creation",
        ).json()
        require(
            admin.put(
                f"/api/v1/admin/inventory/rooms/{room['id']}",
                json={
                    "room_number": "401",
                    "category_id": category["id"],
                    "floor": 4,
                    "description": "Updated acceptance room with courtyard view.",
                    "status": "maintenance",
                },
            ),
            200,
            "administrator room update",
        )
        facility = require(
            admin.post(
                "/api/v1/admin/inventory/facilities",
                json={
                    "name": "Reading lounge",
                    "icon": "book-open",
                    "description": "Quiet lounge with newspapers and books.",
                    "is_active": True,
                },
            ),
            201,
            "administrator facility creation",
        ).json()
        require(
            admin.put(
                f"/api/v1/admin/inventory/facilities/{facility['id']}",
                json={
                    "name": "Reading lounge",
                    "icon": "book-open",
                    "description": "Updated quiet lounge with newspapers and books.",
                    "is_active": True,
                },
            ),
            200,
            "administrator facility update",
        )

        image_path = BACKEND_ROOT / "app" / "assets" / "demo" / "deluxe-king.png"
        with image_path.open("rb") as image_file:
            uploaded = require(
                admin.post(
                    "/api/v1/admin/inventory/images",
                    data={
                        "alt_text": "Courtyard Studio acceptance image",
                        "category_id": category["id"],
                        "sort_order": "1",
                        "is_cover": "true",
                    },
                    files={"file": ("courtyard-studio.png", image_file, "image/png")},
                ),
                201,
                "administrator image upload",
            ).json()
        require(
            admin.patch(
                f"/api/v1/admin/inventory/images/{uploaded['id']}",
                json={
                    "alt_text": "Updated Courtyard Studio acceptance image",
                    "sort_order": 2,
                    "is_cover": True,
                },
            ),
            200,
            "administrator image update",
        )
        require(
            admin.delete(f"/api/v1/admin/inventory/images/{uploaded['id']}"),
            204,
            "administrator image deletion",
        )
        require(
            admin.delete(f"/api/v1/admin/inventory/rooms/{room['id']}"),
            204,
            "administrator room deletion",
        )
        require(
            admin.delete(f"/api/v1/admin/inventory/categories/{category['id']}"),
            204,
            "administrator category deletion",
        )
        require(
            admin.delete(f"/api/v1/admin/inventory/facilities/{facility['id']}"),
            204,
            "administrator facility deletion",
        )
        if len(inventory["rooms"]) != 8:
            raise RuntimeError(f"Expected 8 seeded rooms, found {len(inventory['rooms'])}")

        pending = require(
            admin.get(
                "/api/v1/admin/operations/bookings",
                params={"status": "pending", "page_size": 100},
            ),
            200,
            "administrator booking queue",
        ).json()["items"]
        if not pending:
            raise RuntimeError("No pending booking available for administrator transition")
        require(
            admin.patch(
                f"/api/v1/admin/operations/bookings/{pending[0]['id']}/status",
                json={
                    "status": "confirmed",
                    "reason": "Front desk verified the guest details and room allocation.",
                },
            ),
            200,
            "administrator booking confirmation",
        )

        new_enquiries = require(
            admin.get(
                "/api/v1/admin/operations/enquiries",
                params={"status": "new", "page_size": 100},
            ),
            200,
            "administrator enquiry queue",
        ).json()["items"]
        if not new_enquiries:
            raise RuntimeError("No new enquiry available for administrator assignment")
        require(
            admin.patch(
                f"/api/v1/admin/operations/enquiries/{new_enquiries[0]['id']}",
                json={
                    "status": "in_progress",
                    "assigned_to": admin_identity["id"],
                    "admin_notes": "Guest relations will reply before the end of the day.",
                },
            ),
            200,
            "administrator enquiry assignment",
        )
        require(
            admin.get("/api/v1/admin/dashboard/summary"),
            200,
            "administrator dashboard summary",
        )
        report_start = (date.today() - timedelta(days=30)).isoformat()
        report_end = (date.today() + timedelta(days=180)).isoformat()
        require(
            admin.get(
                "/api/v1/admin/reports/occupancy",
                params={"start_date": report_start, "end_date": report_end},
            ),
            200,
            "administrator occupancy report",
        )
        require(
            admin.get(
                "/api/v1/admin/reports/revenue",
                params={"start_date": report_start, "end_date": report_end},
            ),
            200,
            "administrator revenue report",
        )
        require(admin.post("/api/v1/auth/logout"), 204, "administrator logout")

    print("REALISTIC ACCEPTANCE SUITE PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
