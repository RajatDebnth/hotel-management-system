from pathlib import Path

from app.db.session import sqlite_url


def test_sqlite_url_uses_absolute_aiosqlite_database(tmp_path: Path) -> None:
    database_path = tmp_path / "local.db"

    url = sqlite_url(database_path)

    assert url.drivername == "sqlite+aiosqlite"
    assert Path(url.database or "") == database_path.resolve()
