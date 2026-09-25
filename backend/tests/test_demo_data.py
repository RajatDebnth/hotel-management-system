from datetime import date
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.passwords import verify_password
from app.db.demo_data import CUSTOMERS, replace_with_realistic_demo_data
from app.db.schema import initialize_database
from app.db.session import build_engine


@pytest.mark.asyncio
async def test_realistic_demo_replaces_content_and_preserves_admin_identity(
    tmp_path: Path,
) -> None:
    database = tmp_path / "data" / "hms.db"
    uploads = tmp_path / "data" / "uploads"
    engine = build_engine(database)
    await initialize_database(
        engine,
        admin_password="OriginalAdministrator!23",
        uploads_dir=uploads,
    )
    async with engine.connect() as connection:
        original_admin_id = (
            await connection.exec_driver_sql(
                "select id from profiles where email = 'admin@example.com'"
            )
        ).scalar_one()
    (uploads / "obsolete-upload.txt").write_text("remove", encoding="utf-8")

    credentials = await replace_with_realistic_demo_data(
        engine,
        uploads,
        today=date(2030, 1, 15),
        administrator_password="RecoveredAdministrator!45",
        customer_password="ArjunCustomer!45",
    )

    async with engine.connect() as connection:
        counts = {
            table: (
                await connection.exec_driver_sql(f'SELECT count(*) FROM "{table}"')
            ).scalar_one()
            for table in ("profiles", "bookings", "booking_status_history", "enquiries")
        }
        admin = (
            await connection.exec_driver_sql(
                "select id, password_hash from profiles where email = 'admin@example.com'"
            )
        ).one()
        names = {
            row[0]
            for row in await connection.exec_driver_sql(
                "select full_name from profiles where role = 'customer'"
            )
        }
        statuses = {
            row[0] for row in await connection.exec_driver_sql("select status from bookings")
        }

    assert counts == {
        "profiles": 21,
        "bookings": 20,
        "booking_status_history": 38,
        "enquiries": 12,
    }
    assert admin[0] == original_admin_id
    assert verify_password("RecoveredAdministrator!45", admin[1])
    assert names == {customer[0] for customer in CUSTOMERS}
    assert statuses == {
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "rejected",
    }
    assert credentials.customer.email == "arjun.mehta@example.com"
    assert verify_password(
        "ArjunCustomer!45",
        (
            await _password_hash(engine, "arjun.mehta@example.com")
        ),
    )
    assert not (uploads / "obsolete-upload.txt").exists()
    assert (uploads / "demo" / "deluxe-king.png").is_file()
    await engine.dispose()


async def _password_hash(engine: AsyncEngine, email: str) -> str:
    async with engine.connect() as connection:
        return (
            await connection.exec_driver_sql(
                "select password_hash from profiles where email = ?", (email,)
            )
        ).scalar_one()
