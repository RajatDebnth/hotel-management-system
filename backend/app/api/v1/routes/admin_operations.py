from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.db.session import get_db_session
from app.schemas.admin_operations import (
    AdminBookingList,
    AdminEnquiryList,
    AdminOption,
    BookingStatus,
    BookingStatusUpdate,
    EnquiryAdmin,
    EnquiryStatus,
    EnquiryUpdate,
)
from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import BookingResponse
from app.services.admin_operations import (
    list_admin_bookings,
    list_admin_enquiries,
    list_admin_options,
    transition_booking,
    update_enquiry,
)

router = APIRouter(prefix="/admin/operations", tags=["admin operations"])


@router.get("/bookings", response_model=AdminBookingList)
async def bookings(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str, Query(max_length=100)] = "",
    status: BookingStatus | None = None,
) -> AdminBookingList:
    return await list_admin_bookings(session, page, page_size, q, status)


@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: UUID,
    payload: BookingStatusUpdate,
    actor: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BookingResponse:
    return await transition_booking(session, actor, booking_id, payload)


@router.get("/enquiries", response_model=AdminEnquiryList)
async def enquiries(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str, Query(max_length=100)] = "",
    status: EnquiryStatus | None = None,
) -> AdminEnquiryList:
    return await list_admin_enquiries(session, page, page_size, q, status)


@router.patch("/enquiries/{enquiry_id}", response_model=EnquiryAdmin)
async def edit_enquiry(
    enquiry_id: UUID,
    payload: EnquiryUpdate,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EnquiryAdmin:
    return await update_enquiry(session, enquiry_id, payload)


@router.get("/admins", response_model=list[AdminOption])
async def admins(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[AdminOption]:
    return await list_admin_options(session)
