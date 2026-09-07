"""Verify admin inventory CRUD, public catalog visibility, Storage, and authorization."""

import asyncio
import base64
import secrets
import sys
from uuid import uuid4

import httpx
from dotenv import dotenv_values

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


async def main() -> None:
    config = dotenv_values(".env")
    base_url = str(config["SUPABASE_URL"]).rstrip("/")
    secret_key = str(config["SUPABASE_SECRET_KEY"])
    service_headers = {"apikey": secret_key, "Authorization": f"Bearer {secret_key}"}
    password = f"Hms!{secrets.token_urlsafe(24)}"
    users: list[str] = []
    tokens: list[str] = []
    ids: dict[str, str] = {}
    api = "http://localhost:8000/api/v1"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            for role in ("admin", "customer"):
                email = f"codex-inventory-{role}-{uuid4().hex}@example.com"
                created = await client.post(
                    f"{base_url}/auth/v1/admin/users",
                    headers=service_headers,
                    json={"email": email, "password": password, "email_confirm": True},
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
            denied = await client.post(
                f"{api}/admin/inventory/facilities",
                headers=customer_headers,
                json={"name": "Denied facility", "description": "Must not persist"},
            )
            assert denied.status_code == 403

            slug = f"smoke-suite-{uuid4().hex[:8]}"
            category = await client.post(
                f"{api}/admin/inventory/categories",
                headers=admin_headers,
                json={
                    "name": "Smoke Suite",
                    "slug": slug,
                    "description": "Temporary admin inventory test",
                    "base_price": 1234,
                    "max_guests": 2,
                    "bed_type": "King",
                    "room_size_sq_m": 30,
                    "is_active": True,
                },
            )
            category.raise_for_status()
            ids["categories"] = category.json()["id"]
            room = await client.post(
                f"{api}/admin/inventory/rooms",
                headers=admin_headers,
                json={
                    "room_number": f"SMOKE-{uuid4().hex[:6]}",
                    "category_id": ids["categories"],
                    "floor": 1,
                    "description": "Temporary room",
                    "status": "active",
                },
            )
            room.raise_for_status()
            ids["rooms"] = room.json()["id"]
            facility = await client.post(
                f"{api}/admin/inventory/facilities",
                headers=admin_headers,
                json={
                    "name": f"Smoke Facility {uuid4().hex[:6]}",
                    "icon": "sparkles",
                    "description": "Temporary facility",
                    "is_active": True,
                },
            )
            facility.raise_for_status()
            ids["facilities"] = facility.json()["id"]

            image = await client.post(
                f"{api}/admin/inventory/images",
                headers=admin_headers,
                data={
                    "category_id": ids["categories"],
                    "alt_text": "Smoke room",
                    "is_cover": "true",
                },
                files={"file": ("smoke.png", PNG, "image/png")},
            )
            image.raise_for_status()
            ids["images"] = image.json()["id"]
            stored = await client.get(image.json()["url"])
            stored.raise_for_status()

            public = await client.get(f"{api}/catalog/rooms/{slug}")
            public.raise_for_status()
            assert public.json()["name"] == "Smoke Suite"
            inventory = await client.get(f"{api}/admin/inventory", headers=admin_headers)
            inventory.raise_for_status()
            assert any(item["id"] == ids["rooms"] for item in inventory.json()["rooms"])

            renamed = await client.put(
                f"{api}/admin/inventory/categories/{ids['categories']}",
                headers=admin_headers,
                json={
                    "name": "Updated Smoke Suite",
                    "slug": slug,
                    "description": "Updated temporary test",
                    "base_price": 1500,
                    "max_guests": 2,
                    "bed_type": "King",
                    "room_size_sq_m": 30,
                    "is_active": True,
                },
            )
            renamed.raise_for_status()

        print("customer_admin_mutation_denied: passed")
        print("admin_category_room_facility_crud_and_public_catalog: passed")
        print("validated_storage_upload_and_public_read: passed")
    finally:
        async with httpx.AsyncClient(timeout=30) as client:
            for kind in ("images", "rooms", "categories", "facilities"):
                if kind in ids and tokens:
                    response = await client.delete(
                        f"{api}/admin/inventory/{kind}/{ids[kind]}",
                        headers={"Authorization": f"Bearer {tokens[0]}"},
                    )
                    response.raise_for_status()
            for user_id in users:
                response = await client.delete(
                    f"{base_url}/auth/v1/admin/users/{user_id}", headers=service_headers
                )
                response.raise_for_status()
        print("disposable_inventory_records_cleanup: passed")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
