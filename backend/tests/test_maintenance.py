import json
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.passwords import verify_password
from app.db.maintenance import (
    EXPORT_FORMAT,
    TABLES,
    AdminPasswordResetError,
    InvalidBackupError,
    ensure_runtime_targets,
    export_bookings_csv,
    export_database,
    import_database,
    load_backup,
    reset_builtin_admin_password,
    reset_database,
    rotate_session_signing_key,
)
from app.db.schema import SCHEMA_VERSION, initialize_database
from app.db.session import build_engine

ADMIN_PASSWORD = "MaintenanceAdmin!23"


async def add_customer_booking(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.exec_driver_sql(
            """insert into profiles
            (id, email, password_hash, full_name, role)
            values ('user-1', 'guest@example.com', 'test-hash', 'Guest One', 'customer')"""
        )
        await connection.exec_driver_sql(
            """insert into bookings
            (id, booking_reference, user_id, room_id, check_in, check_out,
             adult_count, child_count, guest_name, guest_email, guest_phone,
             price_per_night, night_count, subtotal, tax_amount, total_amount, status)
            values ('booking-1', 'HMS-LOCAL-001', 'user-1',
             '30000000-0000-0000-0000-000000000101', '2030-01-10', '2030-01-12',
             2, 0, 'Guest One', 'guest@example.com', '9876543210',
             520000, 2, 1040000, 0, 1040000, 'confirmed')"""
        )
        await connection.exec_driver_sql(
            """insert into booking_status_history
            (id, booking_id, from_status, to_status, changed_by, reason)
            values ('history-1', 'booking-1', null, 'confirmed', 'user-1', 'Imported fixture')"""
        )
        await connection.exec_driver_sql(
            """insert into enquiries
            (id, user_id, name, email, subject, message)
            values ('enquiry-1', 'user-1', 'Guest One', 'guest@example.com',
             'Question', 'Can I arrive late?')"""
        )


@pytest.mark.asyncio
async def test_json_export_import_and_booking_csv_round_trip(tmp_path: Path) -> None:
    source = build_engine(tmp_path / "source.db")
    await initialize_database(
        source,
        admin_password=ADMIN_PASSWORD,
        uploads_dir=tmp_path / "source-uploads",
    )
    await add_customer_booking(source)

    backup_path = tmp_path / "backup.json"
    payload = await export_database(source, backup_path)
    loaded = load_backup(backup_path)
    assert payload["format"] == EXPORT_FORMAT
    assert payload["schema_version"] == SCHEMA_VERSION
    assert set(payload["tables"]) == set(TABLES)
    assert loaded["tables"]["bookings"][0]["booking_reference"] == "HMS-LOCAL-001"

    csv_path = tmp_path / "bookings.csv"
    assert await export_bookings_csv(source, csv_path) == 1
    csv_content = csv_path.read_text(encoding="utf-8")
    assert "HMS-LOCAL-001" in csv_content
    assert "Deluxe King" in csv_content
    assert "test-hash" not in csv_content

    target = build_engine(tmp_path / "target.db")
    await initialize_database(
        target,
        admin_password="DifferentAdmin!45",
        uploads_dir=tmp_path / "target-uploads",
    )
    counts = await import_database(target, loaded)
    assert counts["profiles"] == 2
    assert counts["bookings"] == 1
    async with target.connect() as connection:
        reference = (
            await connection.exec_driver_sql("select booking_reference from bookings")
        ).scalar_one()
        customer = (
            await connection.exec_driver_sql(
                "select email from profiles where id = 'user-1'"
            )
        ).scalar_one()
    assert reference == "HMS-LOCAL-001"
    assert customer == "guest@example.com"

    await source.dispose()
    await target.dispose()


@pytest.mark.asyncio
async def test_import_rejects_tampering_before_replacing_data(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "local.db")
    await initialize_database(
        engine, admin_password=ADMIN_PASSWORD, uploads_dir=tmp_path / "uploads"
    )
    backup_path = tmp_path / "backup.json"
    payload = await export_database(engine, backup_path)
    payload["tables"]["profiles"][0]["unexpected"] = "unsafe"

    with pytest.raises(InvalidBackupError, match="invalid columns"):
        await import_database(engine, payload)
    async with engine.connect() as connection:
        assert (await connection.exec_driver_sql("select count(*) from profiles")).scalar_one() == 1
    await engine.dispose()


@pytest.mark.asyncio
async def test_reset_is_confined_and_recreates_seed_and_media(tmp_path: Path) -> None:
    runtime = tmp_path / "data"
    database = runtime / "hms.db"
    uploads = runtime / "uploads"
    engine = build_engine(database)
    await initialize_database(engine, admin_password="OldAdministrator!23", uploads_dir=uploads)
    await engine.dispose()
    (uploads / "private.txt").write_text("remove me", encoding="utf-8")

    credential = await reset_database(
        database,
        uploads,
        allowed_root=runtime,
        admin_password=ADMIN_PASSWORD,
    )
    assert credential is not None
    assert credential.email == "admin@example.com"
    assert not (uploads / "private.txt").exists()
    assert (uploads / "demo" / "deluxe-king.png").is_file()

    verify = build_engine(database)
    async with verify.connect() as connection:
        version = (await connection.exec_driver_sql("PRAGMA user_version")).scalar_one()
        categories = (
            await connection.exec_driver_sql("select count(*) from room_categories")
        ).scalar_one()
        assert version == SCHEMA_VERSION
        assert categories == 3
        assert (await connection.exec_driver_sql("select count(*) from profiles")).scalar_one() == 1
    await verify.dispose()

    with pytest.raises(ValueError, match="outside"):
        ensure_runtime_targets(tmp_path / "outside.db", uploads, allowed_root=runtime)


def test_backup_loader_rejects_invalid_json(tmp_path: Path) -> None:
    invalid = tmp_path / "bad.json"
    invalid.write_text("not-json", encoding="utf-8")
    with pytest.raises(InvalidBackupError, match="Could not read backup"):
        load_backup(invalid)


@pytest.mark.asyncio
async def test_admin_password_reset_preserves_data_and_rotates_sessions(tmp_path: Path) -> None:
    database = tmp_path / "data" / "hms.db"
    engine = build_engine(database)
    await initialize_database(
        engine,
        admin_password="OldAdministrator!23",
        uploads_dir=tmp_path / "data" / "uploads",
    )
    await add_customer_booking(engine)

    credential = await reset_builtin_admin_password(
        engine,
        password="NewAdministrator!45",
    )
    async with engine.connect() as connection:
        admin_hash = (
            await connection.exec_driver_sql(
                "select password_hash from profiles where email = 'admin@example.com'"
            )
        ).scalar_one()
        assert (await connection.exec_driver_sql("select count(*) from bookings")).scalar_one() == 1
        assert (await connection.exec_driver_sql("select count(*) from profiles")).scalar_one() == 2
    assert credential.email == "admin@example.com"
    assert verify_password("NewAdministrator!45", admin_hash)
    assert not verify_password("OldAdministrator!23", admin_hash)

    session_key = tmp_path / "data" / ".session-key"
    session_key.write_text("old-session-key-that-is-long-enough-to-use", encoding="utf-8")
    rotate_session_signing_key(session_key)
    rotated = session_key.read_text(encoding="utf-8")
    assert rotated != "old-session-key-that-is-long-enough-to-use"
    assert len(rotated) >= 32

    async with engine.begin() as connection:
        await connection.exec_driver_sql(
            "update profiles set role = 'customer' where email = 'admin@example.com'"
        )
    with pytest.raises(AdminPasswordResetError, match="active administrator"):
        await reset_builtin_admin_password(engine, password="RejectedPassword!45")
    await engine.dispose()


@pytest.mark.asyncio
async def test_export_refuses_to_overwrite_existing_file(tmp_path: Path) -> None:
    engine = build_engine(tmp_path / "local.db")
    await initialize_database(
        engine, admin_password=ADMIN_PASSWORD, uploads_dir=tmp_path / "uploads"
    )
    output = tmp_path / "backup.json"
    output.write_text(json.dumps({"existing": True}), encoding="utf-8")
    with pytest.raises(FileExistsError, match="Refusing to overwrite"):
        await export_database(engine, output)
    assert json.loads(output.read_text(encoding="utf-8")) == {"existing": True}
    await engine.dispose()
