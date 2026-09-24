"""Replace local application tables from a validated JSON backup."""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from _local_cli import refuse_if_backend_running  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.maintenance import import_database, load_backup, summarize_counts  # noqa: E402
from app.db.session import get_engine  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Replace all local table data from a JSON export. Stop the backend first."
    )
    parser.add_argument("backup", type=Path)
    parser.add_argument(
        "--yes", action="store_true", help="Confirm replacement of local table data."
    )
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    if not args.yes:
        raise SystemExit(
            "Refusing to import without --yes. Stop the backend and back up data first."
        )
    if not args.backup.is_file():
        raise SystemExit(f"Backup file not found: {args.backup}")
    settings = get_settings()
    if not settings.database_path.is_file():
        raise SystemExit("Local database does not exist. Run seed_db.py before importing.")
    refuse_if_backend_running(str(settings.api_url))
    payload = load_backup(args.backup)
    engine = get_engine()
    counts = await import_database(engine, payload)
    await engine.dispose()
    print(f"Import complete: {get_settings().database_path.resolve()}")
    print(summarize_counts(counts))
    print("Uploaded image bytes are not part of the JSON export; restore uploads separately.")


if __name__ == "__main__":
    asyncio.run(run())
