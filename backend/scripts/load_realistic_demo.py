"""Replace local runtime content with a realistic hotel acceptance dataset."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from _local_cli import refuse_if_backend_running  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.demo_data import replace_with_realistic_demo_data  # noqa: E402
from app.db.maintenance import ensure_runtime_targets  # noqa: E402
from app.db.session import build_engine  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Delete all local application content except the built-in administrator "
            "identity, then load a realistic 20-customer hotel dataset."
        )
    )
    parser.add_argument("--yes", action="store_true", help="Confirm destructive replacement.")
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    if not args.yes:
        raise SystemExit("Refusing to replace local data without --yes. Create a backup first.")
    settings = get_settings()
    refuse_if_backend_running(str(settings.api_url))
    if not settings.database_path.is_file():
        raise SystemExit(f"Local database does not exist: {settings.database_path.resolve()}")
    ensure_runtime_targets(
        settings.database_path,
        settings.uploads_dir,
        allowed_root=BACKEND_ROOT / "data",
    )
    engine = build_engine(settings.database_path)
    try:
        credentials = await replace_with_realistic_demo_data(engine, settings.uploads_dir)
    finally:
        await engine.dispose()
    print(
        json.dumps(
            {
                "administrator": {
                    "email": credentials.administrator.email,
                    "password": credentials.administrator.password,
                },
                "customer": {
                    "email": credentials.customer.email,
                    "password": credentials.customer.password,
                },
            }
        )
    )


if __name__ == "__main__":
    asyncio.run(run())
