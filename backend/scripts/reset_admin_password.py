"""Reset the built-in local administrator password without deleting application data."""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from _local_cli import refuse_if_backend_running  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.maintenance import (  # noqa: E402
    reset_builtin_admin_password,
    rotate_session_signing_key,
)
from app.db.session import build_engine  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a new password for admin@example.com without deleting hotel data. "
            "Stop the backend first."
        )
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm the administrator password reset and session invalidation.",
    )
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    if not args.yes:
        raise SystemExit(
            "Refusing to reset the administrator password without --yes. "
            "Stop the backend first."
        )

    settings = get_settings()
    refuse_if_backend_running(str(settings.api_url))
    if not settings.database_path.is_file():
        raise SystemExit(
            f"Local database does not exist: {settings.database_path.resolve()}"
        )

    engine = build_engine(settings.database_path)
    try:
        credential = await reset_builtin_admin_password(engine)
    finally:
        await engine.dispose()
    rotate_session_signing_key(settings.secret_key_path)

    print("Administrator password reset complete.")
    print(f"Email: {credential.email}")
    print(f"New password: {credential.password}")
    print("All existing login sessions were invalidated.")
    print("Start the application, sign in, and change this password from the account page.")


if __name__ == "__main__":
    asyncio.run(run())
