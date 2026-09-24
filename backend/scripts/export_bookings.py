"""Export booking/reporting rows to CSV."""

import argparse
import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.maintenance import export_bookings_csv  # noqa: E402
from app.db.session import get_engine  # noqa: E402


def parse_args() -> argparse.Namespace:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    parser = argparse.ArgumentParser(description="Export bookings to a reporting CSV file.")
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=BACKEND_ROOT / "data" / "exports" / f"bookings-{timestamp}.csv",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite an existing output file.")
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    settings = get_settings()
    if not settings.database_path.exists():
        raise SystemExit(
            "Local database does not exist. Start the backend or run seed_db.py first."
        )
    engine = get_engine()
    count = await export_bookings_csv(engine, args.output, overwrite=args.force)
    await engine.dispose()
    print(f"Sensitive booking CSV written to: {args.output.resolve()}")
    print(f"bookings={count}")


if __name__ == "__main__":
    asyncio.run(run())
