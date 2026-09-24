from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "dist" / "hotel-management-system-local.zip"
ARCHIVE_PREFIX = "hotel-management-system/"

REQUIRED_MEMBERS = {
    "README.md",
    "start_local.py",
    "backend/pyproject.toml",
    "frontend/package-lock.json",
    "backend/app/assets/demo/deluxe-king.png",
    "backend/app/assets/demo/family-suite.png",
    "backend/app/assets/demo/garden-twin.png",
}

FORBIDDEN_PARTS = {
    ".venv",
    "node_modules",
    ".next",
    ".ruff_cache",
    ".pytest_cache",
    "__pycache__",
    "test-results",
    "playwright-report",
    "tmp",
    "dist",
}

FORBIDDEN_NAMES = {
    ".env",
    ".env.local",
    ".session-key",
    "hms.db",
}


class PackageError(RuntimeError):
    pass


def run_git(*args: str, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=capture,
        text=True,
    )


def require_clean_repository() -> None:
    status = run_git("status", "--porcelain", "--untracked-files=all").stdout.strip()
    if status:
        raise PackageError(
            "The repository has uncommitted or untracked files. Commit or remove them "
            "before creating a release archive."
        )


def archive_member_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    try:
        relative = path.relative_to(PurePosixPath(ARCHIVE_PREFIX.rstrip("/")))
    except ValueError as exc:
        raise PackageError(f"Archive member is outside the release folder: {name}") from exc
    return relative


def validate_archive(output: Path) -> int:
    with zipfile.ZipFile(output) as archive:
        files = [name for name in archive.namelist() if not name.endswith("/")]
        relative_paths = [archive_member_path(name) for name in files]

    found = {path.as_posix() for path in relative_paths}
    missing = sorted(REQUIRED_MEMBERS - found)
    if missing:
        raise PackageError(f"Archive is missing required files: {', '.join(missing)}")

    forbidden: list[str] = []
    for path in relative_paths:
        if FORBIDDEN_PARTS.intersection(path.parts):
            forbidden.append(path.as_posix())
            continue
        if path.name in FORBIDDEN_NAMES or path.suffix == ".log":
            forbidden.append(path.as_posix())

    if forbidden:
        raise PackageError(
            "Archive contains runtime, dependency, or secret files: "
            + ", ".join(sorted(forbidden))
        )

    return len(files)


def create_archive(output: Path) -> tuple[int, str]:
    require_clean_repository()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.unlink(missing_ok=True)

    try:
        run_git(
            "archive",
            "--format=zip",
            f"--prefix={ARCHIVE_PREFIX}",
            f"--output={output}",
            "HEAD",
        )
        file_count = validate_archive(output)
    except Exception:
        output.unlink(missing_ok=True)
        raise

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return file_count, digest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create and validate a clean local-release ZIP from the current Git commit."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"ZIP output path (default: {DEFAULT_OUTPUT.relative_to(ROOT)})",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = args.output.resolve()
    try:
        file_count, digest = create_archive(output)
    except (PackageError, subprocess.CalledProcessError, OSError, zipfile.BadZipFile) as exc:
        print(f"Packaging failed: {exc}", file=sys.stderr)
        return 1

    print(f"Created: {output}")
    print(f"Files: {file_count}")
    print(f"SHA-256: {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
