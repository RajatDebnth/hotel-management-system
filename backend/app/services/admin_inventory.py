import secrets
from urllib.parse import quote
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.storage import resolve_upload_path, write_upload
from app.db.money import from_paise, to_paise
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
    base_url = str(get_settings().api_url).rstrip("/")
    return f"{base_url}/media/{quote(path, safe='/')}"


def _image(row: dict[str, object]) -> ImageAdmin:
    return ImageAdmin(**row, url=_image_url(str(row["storage_path"])))


async def inventory(session: AsyncSession) -> InventoryResponse:
    categories = (await session.execute(text("""
        select id, name, slug, description, base_price, max_guests, bed_type,
               room_size_sq_m, is_active from room_categories order by name
    """))).mappings().all()
    rooms = (await session.execute(text("""
        select r.id, r.room_number, r.category_id, r.floor, r.description,
               r.status, c.name as category_name from rooms r
        join room_categories c on c.id = r.category_id order by r.room_number
    """))).mappings().all()
    facilities = (await session.execute(text("""
        select id, name, icon, description, is_active from facilities order by name
    """))).mappings().all()
    images = (await session.execute(text("""
        select id, room_id, category_id, storage_path, alt_text, sort_order, is_cover
        from room_images order by category_id, room_id, sort_order, created_at
    """))).mappings().all()
    facility_links = (await session.execute(text("""
        select category_id, facility_id from room_category_facilities
        order by category_id, facility_id
    """))).mappings().all()
    facility_ids_by_category: dict[str, list[UUID]] = {}
    for link in facility_links:
        facility_ids_by_category.setdefault(str(link["category_id"]), []).append(
            UUID(str(link["facility_id"]))
        )
    return InventoryResponse(
        categories=[
            CategoryAdmin.model_validate({
                **row,
                "base_price": from_paise(row["base_price"]),
                "facility_ids": facility_ids_by_category.get(str(row["id"]), []),
            })
            for row in categories
        ],
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
    facility_ids: list[UUID] = []
    if table == "room_categories":
        facility_ids = values.pop("facility_ids")
        values["base_price"] = to_paise(values["base_price"])
        if values["room_size_sq_m"] is not None:
            values["room_size_sq_m"] = float(values["room_size_sq_m"])
    columns = list(values)
    try:
        if record_id is None:
            query = text(
                f"insert into {table} ({', '.join(columns)}) "
                f"values ({', '.join(f':{column}' for column in columns)}) returning id"
            )
        else:
            values["id"] = record_id
            query = text(
                f"update {table} set "
                f"{', '.join(f'{column} = :{column}' for column in columns)} "
                "where id = :id returning id"
            )
        result = (await session.execute(query, values)).scalar_one_or_none()
        if result is None:
            raise HTTPException(status_code=404, detail="Inventory record not found")
        if table == "room_categories":
            await session.execute(
                text("delete from room_category_facilities where category_id = :category_id"),
                {"category_id": result},
            )
            for facility_id in dict.fromkeys(facility_ids):
                await session.execute(
                    text("""insert into room_category_facilities (category_id, facility_id)
                        values (:category_id, :facility_id)"""),
                    {"category_id": result, "facility_id": facility_id},
                )
        await session.commit()
        return UUID(str(result))
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
                text(f"delete from {table} where id = :id returning id"), {"id": record_id}
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
    try:
        stored_file = write_upload(get_settings().uploads_dir, path, content)
    except OSError as error:
        raise HTTPException(status_code=500, detail="Unable to store image") from error
    try:
        if is_cover:
            field = "category_id" if category_id else "room_id"
            await session.execute(
                text(f"update room_images set is_cover = false where {field} = :parent"),
                {"parent": parent},
            )
        row = (
            await session.execute(
                text("""
                    insert into room_images
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
        stored_file.unlink(missing_ok=True)
        raise


async def update_image(session: AsyncSession, image_id: UUID, payload: ImageUpdate) -> ImageAdmin:
    parent = (
        await session.execute(
            text("select room_id, category_id from room_images where id = :id"),
            {"id": image_id},
        )
    ).mappings().one_or_none()
    if parent is None:
        raise HTTPException(status_code=404, detail="Image not found")
    if payload.is_cover:
        field = "category_id" if parent["category_id"] else "room_id"
        value = parent["category_id"] or parent["room_id"]
        await session.execute(
            text(f"update room_images set is_cover = false where {field} = :parent"),
            {"parent": value},
        )
    row = (
        await session.execute(
            text("""
                update room_images set alt_text = :alt_text,
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
    storage_path = (
        await session.execute(
            text("select storage_path from room_images where id = :id"),
            {"id": image_id},
        )
    ).scalar_one_or_none()
    if storage_path is None:
        raise HTTPException(status_code=404, detail="Image not found")
    target = resolve_upload_path(get_settings().uploads_dir, str(storage_path))
    quarantine = target.with_name(f"{target.name}.{secrets.token_hex(8)}.deleting")
    moved = False
    if target.is_file():
        target.replace(quarantine)
        moved = True
    try:
        await session.execute(text("delete from room_images where id = :id"), {"id": image_id})
        await session.commit()
    except Exception:
        await session.rollback()
        if moved and quarantine.exists() and not target.exists():
            quarantine.replace(target)
        raise
    if moved:
        quarantine.unlink(missing_ok=True)
