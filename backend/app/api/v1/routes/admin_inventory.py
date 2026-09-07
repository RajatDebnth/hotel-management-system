from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.db.session import get_db_session
from app.schemas.admin_inventory import (
    CategoryWrite,
    FacilityWrite,
    ImageAdmin,
    ImageUpdate,
    InventoryResponse,
    RoomWrite,
)
from app.schemas.auth import AuthenticatedUser
from app.services.admin_inventory import (
    delete_image,
    delete_record,
    inventory,
    update_image,
    upload_image,
    write_record,
)

router = APIRouter(prefix="/admin/inventory", tags=["admin inventory"])


@router.get("", response_model=InventoryResponse)
async def get_inventory(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> InventoryResponse:
    return await inventory(session)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
@router.put("/categories/{record_id}")
async def save_category(
    payload: CategoryWrite,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    record_id: UUID | None = None,
) -> dict[str, UUID]:
    return {"id": await write_record(session, "room_categories", payload, record_id)}


@router.post("/rooms", status_code=status.HTTP_201_CREATED)
@router.put("/rooms/{record_id}")
async def save_room(
    payload: RoomWrite,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    record_id: UUID | None = None,
) -> dict[str, UUID]:
    return {"id": await write_record(session, "rooms", payload, record_id)}


@router.post("/facilities", status_code=status.HTTP_201_CREATED)
@router.put("/facilities/{record_id}")
async def save_facility(
    payload: FacilityWrite,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    record_id: UUID | None = None,
) -> dict[str, UUID]:
    return {"id": await write_record(session, "facilities", payload, record_id)}


@router.delete("/{kind}/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_record(
    kind: Literal["categories", "rooms", "facilities", "images"],
    record_id: UUID,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    if kind == "images":
        await delete_image(session, record_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    tables = {"categories": "room_categories", "rooms": "rooms", "facilities": "facilities"}
    await delete_record(session, tables[kind], record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/images", response_model=ImageAdmin, status_code=status.HTTP_201_CREATED)
async def add_image(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    file: Annotated[UploadFile, File()],
    alt_text: Annotated[str, Form(min_length=1, max_length=200)],
    category_id: Annotated[UUID | None, Form()] = None,
    room_id: Annotated[UUID | None, Form()] = None,
    sort_order: Annotated[int, Form(ge=0)] = 0,
    is_cover: Annotated[bool, Form()] = False,
) -> ImageAdmin:
    return await upload_image(
        session, file, alt_text, category_id, room_id, sort_order, is_cover
    )


@router.patch("/images/{image_id}", response_model=ImageAdmin)
async def edit_image(
    image_id: UUID,
    payload: ImageUpdate,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ImageAdmin:
    return await update_image(session, image_id, payload)


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_image(
    image_id: UUID,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    await delete_image(session, image_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
