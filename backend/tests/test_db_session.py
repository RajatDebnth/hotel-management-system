from app.db.session import get_async_database_url


def test_plain_postgres_url_uses_asyncpg_driver() -> None:
    url = get_async_database_url("postgresql://postgres:password@localhost/postgres")

    assert url.drivername == "postgresql+asyncpg"


def test_explicit_driver_is_preserved() -> None:
    url = get_async_database_url(
        "postgresql+asyncpg://postgres:password@localhost/postgres"
    )

    assert url.drivername == "postgresql+asyncpg"
