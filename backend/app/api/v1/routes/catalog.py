from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.catalog import (
    AvailabilityResponse,
    FacilityResponse,
    RoomCategoryListResponse,
    RoomCategoryResponse,
)
from app.services.availability import validate_stay
from app.services.catalog import get_category, list_categories

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/rooms", response_model=RoomCategoryListResponse)
async def rooms(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 12,
    q: Annotated[str, Query(max_length=100)] = "",
    check_in: date | None = None,
    check_out: date | None = None,
    guests: Annotated[int | None, Query(ge=1, le=20)] = None,
    min_price: Annotated[Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0)] = None,
    category: Annotated[str, Query(max_length=100, pattern=r"^[a-z0-9-]*$")] = "",
) -> RoomCategoryListResponse:
    if (check_in is None) != (check_out is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Check-in and check-out must be provided together",
        )
    if check_in is not None and check_out is not None:
        validate_stay(check_in, check_out)
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Minimum price cannot exceed maximum price",
        )
    return await list_categories(
        session,
        page,
        page_size,
        q,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        min_price=min_price,
        max_price=max_price,
        category=category,
    )


@router.get("/availability", response_model=AvailabilityResponse)
async def availability(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    check_in: date,
    check_out: date,
    guests: Annotated[int, Query(ge=1, le=20)] = 1,
) -> AvailabilityResponse:
    nights = validate_stay(check_in, check_out)
    result = await list_categories(
        session,
        1,
        100,
        "",
        check_in=check_in,
        check_out=check_out,
        guests=guests,
    )
    return AvailabilityResponse(
        check_in=check_in,
        check_out=check_out,
        nights=nights,
        guests=guests,
        items=result.items,
    )


@router.get("/rooms/{slug}", response_model=RoomCategoryResponse)
async def room(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> RoomCategoryResponse:
    category = await get_category(session, slug)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room category not found")
    return category


@router.get("/facilities", response_model=list[FacilityResponse])
async def facilities(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[FacilityResponse]:
    result = await session.execute(
        text(
            "select id, name, icon, description from public.facilities "
            "where is_active order by name"
        )
    )
    rows = result.mappings().all()
    return [FacilityResponse.model_validate(row) for row in rows]
