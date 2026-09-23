import asyncio
from decimal import Decimal
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.money import from_paise, to_paise
from app.db.schema import SCHEMA_VERSION, initialize_database
from app.db.session import build_engine
from app.schemas.admin_inventory import CategoryWrite
from app.schemas.admin_operations import BookingStatusUpdate
from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import BookingCreate
from app.services.admin_inventory import inventory, write_record
from app.services.admin_operations import list_admin_bookings, transition_booking
from app.services.bookings import create_booking
from app.services.catalog import list_categories
from app.services.reports import dashboard_summary, occupancy_report, revenue_report

CUSTOMER_ID = "40000000-0000-0000-0000-000000000001"
ROOM_ID = "30000000-0000-0000-0000-000000000101"


async def insert_booking(
    connection: object,
    reference: str,
    check_in: str,
    check_out: str,
) -> None:
    await connection.exec_driver_sql(  # type: ignore[attr-defined]
        """insert into bookings (
          booking_reference, user_id, room_id, check_in, check_out,
          adult_count, child_count, guest_name, guest_email, guest_phone,
          price_per_night, night_count, subtotal, tax_amount, total_amount, status
        ) values (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 520000,
          cast(julianday(?) - julianday(?) as integer), 520000, 0, 520000, 'pending')""",
        (
            reference,
            CUSTOMER_ID,
            ROOM_ID,
            check_in,
            check_out,
            "Local Guest",
            "guest@local.test",
            "1234567890",
            check_out,
            check_in,
        ),
    )


@pytest.mark.asyncio
async def test_database_initializes_and_reseeds_idempotently(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "data" / "hms.db")
    try:
        credential = await initialize_database(engine, admin_password="TestAdminPassword!23")
        repeated_credential = await initialize_database(engine)

        async with engine.connect() as connection:
            version = (await connection.exec_driver_sql("PRAGMA user_version")).scalar_one()
            categories = (
                await connection.exec_driver_sql("select count(*) from room_categories")
            ).scalar_one()
            rooms = (await connection.exec_driver_sql("select count(*) from rooms")).scalar_one()
            foreign_keys = (
                await connection.exec_driver_sql("PRAGMA foreign_keys")
            ).scalar_one()

        assert version == SCHEMA_VERSION
        assert credential is not None
        assert credential.email == "admin@example.com"
        assert repeated_credential is None
        assert categories == 3
        assert rooms == 4
        assert foreign_keys == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_schema_version_one_is_upgraded_with_local_credentials(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    try:
        async with engine.begin() as connection:
            await connection.exec_driver_sql("""create table profiles (
              id text primary key,
              full_name text not null default '',
              phone text,
              avatar_path text,
              role text not null default 'customer',
              is_active integer not null default 1,
              created_at text not null default current_timestamp,
              updated_at text not null default current_timestamp
            )""")
            await connection.exec_driver_sql("PRAGMA user_version=1")

        credential = await initialize_database(
            engine, admin_password="TestAdminPassword!23"
        )
        async with engine.connect() as connection:
            columns = {
                row["name"]
                for row in (
                    await connection.exec_driver_sql("PRAGMA table_info(profiles)")
                ).mappings()
            }
            version = (await connection.exec_driver_sql("PRAGMA user_version")).scalar_one()

        assert credential is not None
        assert {"email", "password_hash"} <= columns
        assert version == SCHEMA_VERSION
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_foreign_keys_are_enforced(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    try:
        await initialize_database(engine)
        with pytest.raises(IntegrityError):
            async with engine.begin() as connection:
                await connection.exec_driver_sql(
                    """insert into rooms
                    (room_number, category_id, description) values ('999', 'missing', '')"""
                )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_overlap_is_rejected_and_back_to_back_is_allowed(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    try:
        await initialize_database(engine)
        async with engine.begin() as connection:
            await connection.exec_driver_sql(
                "insert into profiles (id, full_name) values (?, ?)",
                (CUSTOMER_ID, "Local Guest"),
            )
            await insert_booking(connection, "HMS-LOCAL000001", "2026-10-10", "2026-10-12")

        with pytest.raises(IntegrityError, match="booking_overlap"):
            async with engine.begin() as connection:
                await insert_booking(
                    connection, "HMS-LOCAL000002", "2026-10-11", "2026-10-13"
                )

        async with engine.begin() as connection:
            await insert_booking(connection, "HMS-LOCAL000003", "2026-10-12", "2026-10-13")
            count = (
                await connection.exec_driver_sql("select count(*) from bookings")
            ).scalar_one()
        assert count == 2
    finally:
        await engine.dispose()


def test_money_round_trips_as_integer_paise() -> None:
    assert to_paise(Decimal("99.99")) == 9999
    assert from_paise(9999) == Decimal("99.99")


@pytest.mark.asyncio
async def test_concurrent_booking_requests_assign_a_room_once(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    customer = AuthenticatedUser(
        id=UUID(CUSTOMER_ID), email="guest@example.com", role="customer"
    )
    request = BookingCreate(
        category_id=UUID("10000000-0000-0000-0000-000000000003"),
        check_in="2026-11-10",
        check_out="2026-11-12",
        adult_count=1,
        child_count=0,
        guest_name="Local Guest",
        guest_email="guest@example.com",
        guest_phone="1234567890",
    )
    try:
        await initialize_database(engine)
        async with sessions() as session:
            await session.execute(
                text("insert into profiles (id, full_name) values (:id, 'Local Guest')"),
                {"id": customer.id},
            )
            await session.commit()

        async def attempt() -> object:
            async with sessions() as session:
                try:
                    return await create_booking(session, customer, request)
                except HTTPException as error:
                    return error

        outcomes = await asyncio.gather(attempt(), attempt())
        assert sum(not isinstance(item, HTTPException) for item in outcomes) == 1
        conflicts = [item for item in outcomes if isinstance(item, HTTPException)]
        assert len(conflicts) == 1
        assert conflicts[0].status_code == 409
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_sqlite_services_preserve_catalog_booking_and_reports(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "hms.db")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    customer = AuthenticatedUser(
        id=UUID(CUSTOMER_ID), email="guest@example.com", role="customer"
    )
    admin = AuthenticatedUser(
        id=UUID("40000000-0000-0000-0000-000000000002"),
        email="manager@example.com",
        role="admin",
    )
    try:
        await initialize_database(engine)
        async with sessions() as session:
            await session.execute(
                text("""insert into profiles (id, full_name, role) values
                  (:customer_id, 'Local Guest', 'customer'),
                  (:admin_id, 'Local Admin', 'admin')"""),
                {"customer_id": customer.id, "admin_id": admin.id},
            )
            await session.commit()

            catalog = await list_categories(session, 1, 10, "")
            assert catalog.total == 3
            assert catalog.items[0].base_price == Decimal("4400.00")
            assert len((await inventory(session)).rooms) == 4

            category_id = await write_record(
                session,
                "room_categories",
                CategoryWrite(
                    name="Local Studio",
                    slug="local-studio",
                    description="Created through the SQLite inventory service.",
                    base_price=Decimal("1234.56"),
                    max_guests=2,
                    bed_type="Queen",
                    room_size_sq_m=Decimal("24.5"),
                ),
            )
            categories = (await inventory(session)).categories
            created_category = next(item for item in categories if item.id == category_id)
            assert created_category.base_price == Decimal("1234.56")

            booking = await create_booking(
                session,
                customer,
                BookingCreate(
                    category_id=UUID("10000000-0000-0000-0000-000000000003"),
                    check_in="2026-10-10",
                    check_out="2026-10-12",
                    adult_count=2,
                    child_count=0,
                    guest_name="Local Guest",
                    guest_email="guest@example.com",
                    guest_phone="1234567890",
                ),
            )
            assert booking.total_amount == Decimal("8800.00")

            queue = await list_admin_bookings(session, 1, 10, "local", None)
            assert queue.total == 1
            assert queue.items[0].total_amount == Decimal("8800.00")

            confirmed = await transition_booking(
                session,
                admin,
                booking.id,
                BookingStatusUpdate(status="confirmed", reason="Local service test"),
            )
            assert confirmed.status == "confirmed"

            summary = await dashboard_summary(session, booking.check_in)
            occupancy = await occupancy_report(session, booking.check_in, booking.check_out)
            revenue = await revenue_report(session, booking.check_in, booking.check_out)
            assert summary.occupied_rooms == 1
            assert occupancy.occupied_room_nights == 2
            assert revenue.booked_revenue == Decimal("8800.00")
    finally:
        await engine.dispose()
