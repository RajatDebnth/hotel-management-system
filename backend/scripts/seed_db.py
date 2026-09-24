"""Initialize or idempotently reseed the local database."""

import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.schema import initialize_database  # noqa: E402
from app.db.session import get_engine  # noqa: E402


async def run() -> None:
    settings = get_settings()
    engine = get_engine()
    credential = await initialize_database(announce_admin=True)
    async with engine.connect() as connection:
        counts = {
            name: (await connection.exec_driver_sql(f'SELECT count(*) FROM "{name}"')).scalar_one()
            for name in ("room_categories", "rooms", "facilities", "room_images")
        }
    await engine.dispose()
    print(f"Database ready: {settings.database_path.resolve()}")
    print(
        "Seed inventory: "
        + ", ".join(f"{name}={count}" for name, count in counts.items())
    )
    print("Administrator: admin@example.com")
    if credential is None:
        print("Existing administrator credentials were preserved.")


if __name__ == "__main__":
    asyncio.run(run())
