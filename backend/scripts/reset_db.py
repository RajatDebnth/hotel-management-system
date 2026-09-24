"""Destructively reset and reseed the confined local runtime database."""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from _local_cli import refuse_if_backend_running  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.maintenance import reset_database  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Delete local application data and recreate the seeded database. "
            "Stop the backend first."
        )
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm deletion of the database and uploaded media.",
    )
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    if not args.yes:
        raise SystemExit(
            "Refusing to reset without --yes. Stop the backend and back up data first."
        )
    settings = get_settings()
    refuse_if_backend_running(str(settings.api_url))
    credential = await reset_database(
        settings.database_path,
        settings.uploads_dir,
        allowed_root=BACKEND_ROOT / "data",
    )
    print(f"Reset complete: {settings.database_path.resolve()}")
    if credential is not None:
        print(f"Administrator: {credential.email}")
        print(f"One-time initial password: {credential.password}")


if __name__ == "__main__":
    asyncio.run(run())
