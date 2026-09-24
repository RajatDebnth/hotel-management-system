"""Start the FastAPI and Next.js development servers together."""

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def backend_python() -> Path:
    relative = Path("Scripts/python.exe") if os.name == "nt" else Path("bin/python")
    executable = BACKEND / ".venv" / relative
    if not executable.is_file():
        raise SystemExit(
            "Backend environment is missing. Create backend/.venv and install '.[dev]' first."
        )
    return executable


def npm_command() -> str:
    name = "npm.cmd" if os.name == "nt" else "npm"
    executable = shutil.which(name)
    if not executable:
        raise SystemExit("npm is not available on PATH.")
    return executable


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start both local development services.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate local prerequisites without starting services.",
    )
    return parser.parse_args()


def stop(processes: list[subprocess.Popen[bytes]]) -> None:
    if os.name == "nt":
        for process in processes:
            if process.poll() is None:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
        return
    for process in processes:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
    deadline = time.monotonic() + 5
    for process in processes:
        if process.poll() is None:
            try:
                process.wait(max(0, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)


def main() -> None:
    args = parse_args()
    python = backend_python()
    npm = npm_command()
    if args.check:
        print(f"Backend Python: {python}")
        print(f"npm: {npm}")
        print("Local startup prerequisites are available.")
        return
    popen_options = (
        {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
        if os.name == "nt"
        else {"start_new_session": True}
    )
    processes = [
        subprocess.Popen(
            [str(python), "scripts/dev_server.py"], cwd=BACKEND, **popen_options
        ),
        subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND, **popen_options),
    ]

    def request_stop(_signum: int, _frame: object) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, request_stop)
    print("Backend: http://localhost:8000")
    print("Frontend: http://localhost:3000")
    print("Press Ctrl+C to stop both services.")
    interrupted = False
    exited: list[int] = []
    try:
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        exited = [code for process in processes if (code := process.poll()) is not None]
    except KeyboardInterrupt:
        interrupted = True
    finally:
        stop(processes)
    if not interrupted:
        raise SystemExit(f"A local service stopped; both services were shut down: {exited}")


if __name__ == "__main__":
    main()
