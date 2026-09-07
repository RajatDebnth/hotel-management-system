from collections.abc import AsyncIterator
from io import BytesIO
from uuid import UUID

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from app.core.auth import require_user
from app.db.session import get_db_session
from app.main import app
from app.schemas.auth import AuthenticatedUser
from app.services.admin_inventory import MAX_IMAGE_BYTES, upload_image, valid_image_signature


async def fake_session() -> AsyncIterator[object]:
    yield object()


async def customer() -> AuthenticatedUser:
    return AuthenticatedUser(
        id=UUID("40000000-0000-0000-0000-000000000001"),
        email="customer@example.com",
        role="customer",
    )


def test_customer_cannot_mutate_admin_inventory() -> None:
    app.dependency_overrides[require_user] = customer
    app.dependency_overrides[get_db_session] = fake_session
    try:
        response = TestClient(app).post(
            "/api/v1/admin/inventory/facilities",
            json={"name": "Private lounge", "description": "Admin only"},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_image_upload_rejects_unsupported_mime_before_storage() -> None:
    file = UploadFile(
        filename="unsafe.svg",
        file=BytesIO(b"<svg/>"),
        headers={"content-type": "image/svg+xml"},
    )
    with pytest.raises(HTTPException) as error:
        await upload_image(
            object(), file, "Unsafe", UUID("10000000-0000-0000-0000-000000000001"), None, 0, False
        )
    assert error.value.status_code == 422


@pytest.mark.asyncio
async def test_image_upload_rejects_files_over_five_megabytes() -> None:
    file = UploadFile(
        filename="large.jpg",
        file=BytesIO(b"x" * (MAX_IMAGE_BYTES + 1)),
        headers={"content-type": "image/jpeg"},
    )
    with pytest.raises(HTTPException) as error:
        await upload_image(
            object(), file, "Large", UUID("10000000-0000-0000-0000-000000000001"), None, 0, False
        )
    assert error.value.status_code == 413


def test_image_signatures_prevent_spoofed_content_types() -> None:
    assert valid_image_signature(b"\x89PNG\r\n\x1a\ncontent", "image/png")
    assert valid_image_signature(b"\xff\xd8\xffcontent", "image/jpeg")
    assert valid_image_signature(b"RIFF1234WEBPcontent", "image/webp")
    assert not valid_image_signature(b"<script>alert(1)</script>", "image/png")
