"""Exercise catalog reads and enquiry persistence against the configured database."""

import asyncio
import sys

import psycopg
from dotenv import dotenv_values
from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    config = dotenv_values(".env")
    database_url = str(config["DATABASE_URL"]).replace(
        "postgresql+psycopg://", "postgresql://", 1
    )
    enquiry_id: str | None = None
    try:
        with TestClient(app) as client:
            catalog = client.get("/api/v1/catalog/rooms")
            catalog.raise_for_status()
            payload = catalog.json()
            assert payload["total"] == 3
            assert payload["items"][0]["available_room_count"] > 0

            detail = client.get("/api/v1/catalog/rooms/deluxe-king")
            detail.raise_for_status()
            assert detail.json()["facilities"]

            facilities = client.get("/api/v1/catalog/facilities")
            facilities.raise_for_status()
            assert len(facilities.json()) == 4

            enquiry = client.post(
                "/api/v1/enquiries",
                json={
                    "name": "Codex Catalog Smoke",
                    "email": "codex-smoke@example.com",
                    "subject": "Disposable integration check",
                    "message": "This enquiry should be removed by the smoke test.",
                },
            )
            enquiry.raise_for_status()
            enquiry_id = enquiry.json()["id"]

        print("catalog_list_and_detail: passed")
        print("facilities_list: passed")
        print("enquiry_persistence: passed")
    finally:
        if enquiry_id:
            with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
                cursor.execute("delete from public.enquiries where id = %s", (enquiry_id,))
            print("disposable_enquiry_cleanup: passed")


if __name__ == "__main__":
    main()
