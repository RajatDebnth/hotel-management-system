import csv
import json
import os
import secrets
import shutil
from collections.abc import Mapping, Sequence
from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.passwords import hash_password
from app.db.schema import SCHEMA_VERSION, InitialAdminCredential, initialize_database
from app.db.session import build_engine

EXPORT_FORMAT = "hotel-management-sqlite-backup"
EXPORT_VERSION = 1
TABLES = (
    "profiles",
    "room_categories",
    "rooms",
    "facilities",
    "room_category_facilities",
    "room_images",
    "bookings",
    "booking_status_history",
    "enquiries",
)
BOOKING_EXPORT_COLUMNS = (
    "booking_reference",
    "status",
    "check_in",
    "check_out",
    "night_count",
    "room_number",
    "category_name",
    "guest_name",
    "guest_email",
    "guest_phone",
    "adult_count",
    "child_count",
    "price_per_night_paise",
    "subtotal_paise",
    "tax_amount_paise",
    "total_amount_paise",
    "created_at",
)


class InvalidBackupError(ValueError):
    pass


class AdminPasswordResetError(ValueError):
    pass


def _atomic_text_write(path: Path, content: str, *, overwrite: bool) -> None:
    path = path.resolve()
    if path.exists() and not overwrite:
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    try:
        temporary.write_text(content, encoding="utf-8", newline="")
        with suppress(OSError):
            temporary.chmod(0o600)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


async def export_database(
    engine: AsyncEngine, output: Path, *, overwrite: bool = False
) -> dict[str, Any]:
    tables: dict[str, list[dict[str, Any]]] = {}
    async with engine.connect() as connection:
        schema_version = (await connection.exec_driver_sql("PRAGMA user_version")).scalar_one()
        if schema_version != SCHEMA_VERSION:
            raise InvalidBackupError(
                f"Database schema {schema_version} does not match expected {SCHEMA_VERSION}"
            )
        for table in TABLES:
            rows = (await connection.exec_driver_sql(f'SELECT * FROM "{table}"')).mappings()
            tables[table] = [dict(row) for row in rows]
    payload = {
        "format": EXPORT_FORMAT,
        "format_version": EXPORT_VERSION,
        "schema_version": SCHEMA_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "tables": tables,
    }
    _atomic_text_write(
        output,
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        overwrite=overwrite,
    )
    return payload


def load_backup(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise InvalidBackupError(f"Could not read backup: {error}") from error
    if not isinstance(payload, dict):
        raise InvalidBackupError("Backup root must be an object")
    return payload


async def reset_builtin_admin_password(
    engine: AsyncEngine,
    *,
    password: str | None = None,
) -> InitialAdminCredential:
    new_password = password or secrets.token_urlsafe(18)
    async with engine.begin() as connection:
        administrator = (
            await connection.exec_driver_sql(
                """select id, role, is_active from profiles
                where lower(email) = 'admin@example.com'"""
            )
        ).mappings().one_or_none()
        if administrator is None:
            raise AdminPasswordResetError("The built-in administrator does not exist")
        if administrator["role"] != "admin" or not administrator["is_active"]:
            raise AdminPasswordResetError(
                "The built-in administrator must be an active administrator"
            )
        await connection.exec_driver_sql(
            """update profiles set password_hash = ?, updated_at = current_timestamp
            where id = ?""",
            (hash_password(new_password), administrator["id"]),
        )
    return InitialAdminCredential("admin@example.com", new_password)


def rotate_session_signing_key(path: Path) -> None:
    _atomic_text_write(path, secrets.token_urlsafe(48), overwrite=True)


async def _table_columns(engine: AsyncEngine) -> dict[str, tuple[str, ...]]:
    result: dict[str, tuple[str, ...]] = {}
    async with engine.connect() as connection:
        for table in TABLES:
            rows = await connection.exec_driver_sql(f'PRAGMA table_info("{table}")')
            result[table] = tuple(str(row[1]) for row in rows)
    return result


async def validate_backup(
    engine: AsyncEngine, payload: Mapping[str, Any]
) -> dict[str, list[dict[str, Any]]]:
    if payload.get("format") != EXPORT_FORMAT or payload.get("format_version") != EXPORT_VERSION:
        raise InvalidBackupError("Unsupported backup format")
    if payload.get("schema_version") != SCHEMA_VERSION:
        raise InvalidBackupError(
            f"Backup schema must be version {SCHEMA_VERSION}"
        )
    raw_tables = payload.get("tables")
    if not isinstance(raw_tables, dict) or set(raw_tables) != set(TABLES):
        raise InvalidBackupError(
            "Backup must contain every expected application table exactly once"
        )

    columns = await _table_columns(engine)
    validated: dict[str, list[dict[str, Any]]] = {}
    for table in TABLES:
        raw_rows = raw_tables[table]
        if not isinstance(raw_rows, list):
            raise InvalidBackupError(f"Table {table} must be an array")
        expected = set(columns[table])
        rows: list[dict[str, Any]] = []
        for index, raw_row in enumerate(raw_rows):
            if not isinstance(raw_row, dict) or set(raw_row) != expected:
                raise InvalidBackupError(f"Table {table} row {index} has invalid columns")
            rows.append(dict(raw_row))
        validated[table] = rows
    return validated


async def import_database(engine: AsyncEngine, payload: Mapping[str, Any]) -> dict[str, int]:
    tables = await validate_backup(engine, payload)
    columns = await _table_columns(engine)
    async with engine.begin() as connection:
        for table in reversed(TABLES):
            await connection.exec_driver_sql(f'DELETE FROM "{table}"')
        for table in TABLES:
            names = columns[table]
            placeholders = ", ".join("?" for _ in names)
            quoted = ", ".join(f'"{name}"' for name in names)
            statement = f'INSERT INTO "{table}" ({quoted}) VALUES ({placeholders})'
            for row in tables[table]:
                await connection.exec_driver_sql(statement, tuple(row[name] for name in names))
    return {table: len(tables[table]) for table in TABLES}


async def export_bookings_csv(
    engine: AsyncEngine,
    output: Path,
    *,
    overwrite: bool = False,
) -> int:
    query = """select b.booking_reference, b.status, b.check_in, b.check_out,
      b.night_count, r.room_number, c.name as category_name, b.guest_name,
      b.guest_email, b.guest_phone, b.adult_count, b.child_count,
      b.price_per_night as price_per_night_paise, b.subtotal as subtotal_paise,
      b.tax_amount as tax_amount_paise, b.total_amount as total_amount_paise,
      b.created_at
    from bookings b join rooms r on r.id = b.room_id
    join room_categories c on c.id = r.category_id
    order by b.created_at, b.booking_reference"""
    async with engine.connect() as connection:
        rows = [dict(row) for row in (await connection.exec_driver_sql(query)).mappings()]

    from io import StringIO

    buffer = StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=BOOKING_EXPORT_COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    _atomic_text_write(output, buffer.getvalue(), overwrite=overwrite)
    return len(rows)


def ensure_runtime_targets(
    database_path: Path,
    uploads_dir: Path,
    *,
    allowed_root: Path,
) -> None:
    root = allowed_root.resolve()
    database = database_path.resolve()
    uploads = uploads_dir.resolve()
    if database == root or not database.is_relative_to(root):
        raise ValueError("Database path is outside the allowed runtime directory")
    if uploads == root or not uploads.is_relative_to(root):
        raise ValueError("Uploads path is outside the allowed runtime directory")
    if database == uploads or database.is_relative_to(uploads) or uploads.is_relative_to(database):
        raise ValueError("Database and uploads paths must not contain one another")


async def reset_database(
    database_path: Path,
    uploads_dir: Path,
    *,
    allowed_root: Path,
    admin_password: str | None = None,
) -> InitialAdminCredential | None:
    ensure_runtime_targets(database_path, uploads_dir, allowed_root=allowed_root)
    suffix = f".reset-{uuid4().hex}"
    sidecars = (
        database_path.with_name(f"{database_path.name}-wal"),
        database_path.with_name(f"{database_path.name}-shm"),
    )
    targets = (database_path, *sidecars, uploads_dir)
    staged: list[tuple[Path, Path]] = []
    try:
        for target in targets:
            if target.exists():
                backup = target.with_name(f"{target.name}{suffix}")
                target.replace(backup)
                staged.append((target, backup))
    except Exception:
        for target, backup in reversed(staged):
            backup.replace(target)
        raise

    engine = build_engine(database_path)
    try:
        credential = await initialize_database(
            engine,
            admin_password=admin_password,
            uploads_dir=uploads_dir,
        )
        await engine.dispose()
    except Exception:
        await engine.dispose()
        for target in (database_path, *sidecars):
            target.unlink(missing_ok=True)
        if uploads_dir.exists():
            shutil.rmtree(uploads_dir)
        for target, backup in reversed(staged):
            backup.replace(target)
        raise

    for _, backup in staged:
        if backup.is_dir():
            shutil.rmtree(backup)
        else:
            backup.unlink(missing_ok=True)
    return credential


def summarize_counts(counts: Mapping[str, int] | Sequence[tuple[str, int]]) -> str:
    items = counts.items() if isinstance(counts, Mapping) else counts
    return ", ".join(f"{name}={count}" for name, count in items)
