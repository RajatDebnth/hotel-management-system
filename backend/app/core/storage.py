import os
import shutil
from pathlib import Path, PurePosixPath

DEMO_ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "demo"
DEMO_FILES = {
    "deluxe-king.png": "demo/deluxe-king.png",
    "family-suite.png": "demo/family-suite.png",
    "garden-twin.png": "demo/garden-twin.png",
}


def resolve_upload_path(uploads_dir: Path, storage_path: str) -> Path:
    relative = PurePosixPath(storage_path)
    if (
        not storage_path
        or relative.is_absolute()
        or ".." in relative.parts
        or "\\" in storage_path
        or ":" in storage_path
    ):
        raise ValueError("Invalid local storage path")
    root = uploads_dir.resolve()
    target = root.joinpath(*relative.parts).resolve()
    if not target.is_relative_to(root):
        raise ValueError("Invalid local storage path")
    return target


def prepare_uploads(uploads_dir: Path) -> None:
    uploads_dir.mkdir(parents=True, exist_ok=True)
    for orphan in uploads_dir.rglob("*.deleting"):
        orphan.unlink(missing_ok=True)
    for source_name, storage_path in DEMO_FILES.items():
        source = DEMO_ASSET_DIR / source_name
        target = resolve_upload_path(uploads_dir, storage_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copyfile(source, target)


def write_upload(uploads_dir: Path, storage_path: str, content: bytes) -> Path:
    target = resolve_upload_path(uploads_dir, storage_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_BINARY"):
        flags |= os.O_BINARY
    descriptor = os.open(target, flags, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(content)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return target
