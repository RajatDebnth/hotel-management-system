from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def get_async_database_url(database_url: str) -> URL:
    url = make_url(database_url)
    if url.drivername == "postgresql":
        return url.set(drivername="postgresql+asyncpg")
    return url


@lru_cache
def get_engine() -> AsyncEngine:
    database_url = get_settings().database_url
    if database_url is None:
        raise RuntimeError("DATABASE_URL is required for database-backed endpoints")

    url = get_async_database_url(database_url)
    connect_args = {"statement_cache_size": 0} if url.drivername == "postgresql+asyncpg" else {}
    return create_async_engine(url, pool_pre_ping=True, connect_args=connect_args)


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session
