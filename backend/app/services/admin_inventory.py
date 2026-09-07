import secrets
from uuid import UUID

import httpx
from fastapi import HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.schemas.admin_inventory import (
    CategoryAdmin,
    CategoryWrite,
    FacilityAdmin,
    FacilityWrite,
    ImageAdmin,
    ImageUpdate,
    InventoryResponse,
    RoomAdmin,
    RoomWrite,
)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def valid_image_signature(content: bytes, content_type: str) -> bool:
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
    }
    return signatures.get(content_type, False)


def _image_url(path: str) -> str:
    base_url = str(get_settings().supabase_url).rstrip("/")
    return f"{base_url}/storage/v1/object/public/room-images/{path}"


def _image(row: dict[str, object]) -> ImageAdmin:
    return ImageAdmin(**row, url=_image_url(str(row["storage_path"])))


async def inventory(session: AsyncSession) -> InventoryResponse:
    categories = (await session.execute(text("""
        select id, name, slug, description, base_price, max_guests, bed_type,
               room_size_sq_m, is_active from public.room_categories order by name
    """))).mappings().all()
    rooms = (await session.execute(text("""
        select r.id, r.room_number, r.category_id, r.floor, r.description,
               r.status::text, c.name as category_name from public.rooms r
        join public.room_categories c on c.id = r.category_id order by r.room_number
    """))).mappings().all()
    facilities = (await session.execute(text("""
        select id, name, icon, description, is_active from public.facilities order by name
    """))).mappings().all()
    images = (await session.execute(text("""
        select id, room_id, category_id, storage_path, alt_text, sort_order, is_cover
        from public.room_images order by category_id, room_id, sort_order, created_at
    """))).mappings().all()
    return InventoryResponse(
        categories=[CategoryAdmin.model_validate(row) for row in categories],
        rooms=[RoomAdmin.model_validate(row) for row in rooms],
        facilities=[FacilityAdmin.model_validate(row) for row in facilities],
        images=[_image(dict(row)) for row in images],
    )


async def write_record(
    session: AsyncSession,
    table: str,
    model: CategoryWrite | RoomWrite | FacilityWrite,
    record_id: UUID | None = None,
) -> UUID:
    allowed = {"room_categories", "rooms", "facilities"}
    if table not in allowed:
        raise ValueError("Unsupported inventory table")
    values = model.model_dump()
    columns = list(values)
    try:
        if record_id is None:
            query = text(
                f"insert into public.{table} ({', '.join(columns)}) "
                f"values ({', '.join(f':{column}' for column in columns)}) returning id"
            )
        else:
            values["id"] = record_id
            query = text(
                f"update public.{table} set "
                f"{', '.join(f'{column} = :{column}' for column in columns)} "
                "where id = :id returning id"
            )
        result = (await session.execute(query, values)).scalar_one_or_none()
        if result is None:
            raise HTTPException(status_code=404, detail="Inventory record not found")
        await session.commit()
        return result
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Inventory value conflicts with an existing record",
        ) from error


async def delete_record(session: AsyncSession, table: str, record_id: UUID) -> None:
    if table not in {"room_categories", "rooms", "facilities"}:
        raise ValueError("Unsupported inventory table")
    try:
        deleted = (
            await session.execute(
                text(f"delete from public.{table} where id = :id returning id"), {"id": record_id}
            )
        ).scalar_one_or_none()
        if deleted is None:
            raise HTTPException(status_code=404, detail="Inventory record not found")
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="This record is still in use and cannot be deleted",
        ) from error


async def upload_image(
    session: AsyncSession,
    file: UploadFile,
    alt_text: str,
    category_id: UUID | None,
    room_id: UUID | None,
    sort_order: int,
    is_cover: bool,
) -> ImageAdmin:
    if (category_id is None) == (room_id is None):
        raise HTTPException(status_code=422, detail="Choose exactly one category or room")
    extension = IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=422, detail="Only JPEG, PNG, and WebP images are allowed")
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Images cannot exceed 5 MB")
    if not content:
        raise HTTPException(status_code=422, detail="Image file is empty")
    if not valid_image_signature(content, file.content_type or ""):
        raise HTTPException(status_code=422, detail="File content does not match its image type")
    parent = category_id or room_id
    path = f"inventory/{parent}/{secrets.token_hex(16)}{extension}"
    await _storage_upload(path, content, file.content_type or "application/octet-stream")
    try:
        if is_cover:
            field = "category_id" if category_id else "room_id"
            await session.execute(
                text(f"update public.room_images set is_cover = false where {field} = :parent"),
                {"parent": parent},
            )
        row = (
            await session.execute(
                text("""
                    insert into public.room_images
                      (room_id, category_id, storage_path, alt_text, sort_order, is_cover)
                    values (:room_id, :category_id, :path, :alt_text, :sort_order, :is_cover)
                    returning id, room_id, category_id, storage_path, alt_text, sort_order, is_cover
                """),
                {
                    "room_id": room_id,
                    "category_id": category_id,
                    "path": path,
                    "alt_text": alt_text.strip(),
                    "sort_order": sort_order,
                    "is_cover": is_cover,
                },
            )
        ).mappings().one()
        await session.commit()
        return _image(dict(row))
    except Exception:
        await session.rollback()
        await _storage_delete(path)
        raise


async def update_image(session: AsyncSession, image_id: UUID, payload: ImageUpdate) -> ImageAdmin:
    parent = (
        await session.execute(
            text("select room_id, category_id from public.room_images where id = :id for update"),
            {"id": image_id},
        )
    ).mappings().one_or_none()
    if parent is None:
        raise HTTPException(status_code=404, detail="Image not found")
    if payload.is_cover:
        field = "category_id" if parent["category_id"] else "room_id"
        value = parent["category_id"] or parent["room_id"]
        await session.execute(
            text(f"update public.room_images set is_cover = false where {field} = :parent"),
            {"parent": value},
        )
    row = (
        await session.execute(
            text("""
                update public.room_images set alt_text = :alt_text,
                  sort_order = :sort_order, is_cover = :is_cover
                where id = :id
                returning id, room_id, category_id, storage_path, alt_text, sort_order, is_cover
            """),
            {"id": image_id, **payload.model_dump()},
        )
    ).mappings().one()
    await session.commit()
    return _image(dict(row))


async def delete_image(session: AsyncSession, image_id: UUID) -> None:
    row = (
        await session.execute(
            text("delete from public.room_images where id = :id returning storage_path"),
            {"id": image_id},
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Image not found")
    await _storage_delete(str(row))
    await session.commit()


def _storage_headers() -> dict[str, str]:
    settings = get_settings()
    if settings.supabase_secret_key is None:
        raise RuntimeError("SUPABASE_SECRET_KEY is required for image management")
    key = settings.supabase_secret_key.get_secret_value()
    return {"apikey": key, "Authorization": f"Bearer {key}"}


async def _storage_upload(path: str, content: bytes, content_type: str) -> None:
    url = f"{str(get_settings().supabase_url).rstrip('/')}/storage/v1/object/room-images/{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            headers={**_storage_headers(), "Content-Type": content_type, "x-upsert": "false"},
            content=content,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Image storage upload failed")


async def _storage_delete(path: str) -> None:
    url = f"{str(get_settings().supabase_url).rstrip('/')}/storage/v1/object/room-images"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            "DELETE", url, headers={**_storage_headers(), "Content-Type": "application/json"},
            json={"prefixes": [path]},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Image storage deletion failed")
