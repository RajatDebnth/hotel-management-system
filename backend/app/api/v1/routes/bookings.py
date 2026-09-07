from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_user
from app.db.session import get_db_session
from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import (
    BookingCancellation,
    BookingCreate,
    BookingListResponse,
    BookingResponse,
)
from app.services.bookings import (
    cancel_user_booking,
    create_booking,
    get_user_booking,
    list_user_bookings,
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def book(
    payload: BookingCreate,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BookingResponse:
    return await create_booking(session, user, payload)


@router.get("", response_model=BookingListResponse)
async def bookings(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BookingListResponse:
    return await list_user_bookings(session, user)


@router.get("/{reference}", response_model=BookingResponse)
async def booking(
    reference: str,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BookingResponse:
    return await get_user_booking(session, user, reference)


@router.post("/{reference}/cancel", response_model=BookingResponse)
async def cancel_booking(
    reference: str,
    payload: BookingCancellation,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BookingResponse:
    return await cancel_user_booking(session, user, reference, payload.reason)
