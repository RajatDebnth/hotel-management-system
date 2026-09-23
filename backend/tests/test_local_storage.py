from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import UploadFile
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.storage import DEMO_FILES, prepare_uploads, resolve_upload_path
from app.db.schema import initialize_database
from app.db.session import build_engine
from app.main import app
from app.schemas.admin_inventory import ImageUpdate
from app.services import admin_inventory

PNG = b"\x89PNG\r\n\x1a\nlocal-image-content"
CATEGORY_ID = UUID("10000000-0000-0000-0000-000000000001")


def settings_for(uploads_dir: Path) -> SimpleNamespace:
    return SimpleNamespace(uploads_dir=uploads_dir, api_url="http://localhost:8000")


def png_upload(name: str = "room.png") -> UploadFile:
    return UploadFile(
        filename=name,
        file=BytesIO(PNG),
        headers={"content-type": "image/png"},
    )


def test_demo_images_are_copied_and_storage_paths_are_confined(tmp_path: Path) -> None:
    uploads = tmp_path / "uploads"

    prepare_uploads(uploads)
    prepare_uploads(uploads)

    assert {path.relative_to(uploads).as_posix() for path in uploads.rglob("*.png")} == set(
        DEMO_FILES.values()
    )
    assert all(
        path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        for path in uploads.rglob("*.png")
    )
    with pytest.raises(ValueError):
        resolve_upload_path(uploads, "../outside.png")
    with pytest.raises(ValueError):
        resolve_upload_path(uploads, r"C:\outside.png")


def test_fastapi_exposes_the_local_media_mount() -> None:
    assert any(route.path == "/media" and route.name == "media" for route in app.routes)


@pytest.mark.asyncio
async def test_upload_update_and_delete_image_offline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    uploads = tmp_path / "uploads"
    engine = build_engine(tmp_path / "hms.db")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(admin_inventory, "get_settings", lambda: settings_for(uploads))
    try:
        await initialize_database(
            engine, admin_password="TestAdminPassword!23", uploads_dir=uploads
        )
        async with sessions() as session:
            image = await admin_inventory.upload_image(
                session, png_upload(), "A local room image", CATEGORY_ID, None, 5, True
            )
            target = resolve_upload_path(uploads, image.storage_path)
            assert target.read_bytes() == PNG
            assert image.url.startswith("http://localhost:8000/media/inventory/")
            assert image.is_cover

            updated = await admin_inventory.update_image(
                session,
                image.id,
                ImageUpdate(alt_text="Updated local room", sort_order=2, is_cover=True),
            )
            assert updated.alt_text == "Updated local room"
            assert updated.sort_order == 2

            await admin_inventory.delete_image(session, image.id)
            assert not target.exists()
            count = (
                await session.execute(
                    text("select count(*) from room_images where id = :id"), {"id": image.id}
                )
            ).scalar_one()
            assert count == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_failed_metadata_insert_removes_the_uploaded_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    uploads = tmp_path / "uploads"
    engine = build_engine(tmp_path / "hms.db")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(admin_inventory, "get_settings", lambda: settings_for(uploads))
    try:
        await initialize_database(
            engine, admin_password="TestAdminPassword!23", uploads_dir=uploads
        )
        async with sessions() as session:
            with pytest.raises(IntegrityError):
                await admin_inventory.upload_image(
                    session, png_upload(), "Missing parent", uuid4(), None, 0, False
                )
        inventory_dir = uploads / "inventory"
        assert not inventory_dir.exists() or not any(inventory_dir.rglob("*.png"))
    finally:
        await engine.dispose()


class ScalarResult:
    def __init__(self, value: str) -> None:
        self.value = value

    def scalar_one_or_none(self) -> str:
        return self.value


class FailingDeleteSession:
    def __init__(self, storage_path: str) -> None:
        self.storage_path = storage_path
        self.calls = 0
        self.rolled_back = False

    async def execute(self, statement: object, values: object) -> ScalarResult:
        self.calls += 1
        if self.calls == 1:
            return ScalarResult(self.storage_path)
        raise RuntimeError("database delete failed")

    async def commit(self) -> None:
        raise AssertionError("commit must not run")

    async def rollback(self) -> None:
        self.rolled_back = True


@pytest.mark.asyncio
async def test_failed_delete_restores_the_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    uploads = tmp_path / "uploads"
    storage_path = "inventory/category/image.png"
    target = resolve_upload_path(uploads, storage_path)
    target.parent.mkdir(parents=True)
    target.write_bytes(PNG)
    session = FailingDeleteSession(storage_path)
    monkeypatch.setattr(admin_inventory, "get_settings", lambda: settings_for(uploads))

    with pytest.raises(RuntimeError, match="database delete failed"):
        await admin_inventory.delete_image(session, uuid4())  # type: ignore[arg-type]

    assert session.rolled_back
    assert target.read_bytes() == PNG
    assert not list(uploads.rglob("*.deleting"))
