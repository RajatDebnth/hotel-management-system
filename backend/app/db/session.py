import sqlite3
from collections.abc import AsyncIterator
from datetime import date
from functools import lru_cache
from pathlib import Path
from uuid import UUID

from sqlalchemy import event
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

sqlite3.register_adapter(UUID, str)
sqlite3.register_adapter(date, date.isoformat)


def sqlite_url(database_path: Path) -> URL:
    return URL.create("sqlite+aiosqlite", database=str(database_path.resolve()))


def build_engine(database_path: Path) -> AsyncEngine:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_async_engine(
        sqlite_url(database_path),
        connect_args={"timeout": 30},
        isolation_level="AUTOCOMMIT",
    )

    @event.listens_for(engine.sync_engine, "connect")
    def configure_sqlite(dbapi_connection: object, _connection_record: object) -> None:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    @event.listens_for(engine.sync_engine, "begin")
    def begin_immediate(connection: object) -> None:
        # Serialize select-then-insert room assignment across concurrent requests.
        connection.exec_driver_sql("BEGIN IMMEDIATE")  # type: ignore[attr-defined]

    return engine


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    return build_engine(settings.database_path)


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session
