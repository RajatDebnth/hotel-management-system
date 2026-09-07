from math import ceil
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.admin_operations import (
    AdminBookingList,
    AdminEnquiryList,
    AdminOption,
    BookingStatusUpdate,
    EnquiryAdmin,
    EnquiryUpdate,
)
from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import BookingResponse
from app.services.bookings import BOOKING_SELECT

BOOKING_TRANSITIONS = {
    "pending": {"confirmed", "rejected", "cancelled"},
    "confirmed": {"checked_in", "cancelled"},
    "checked_in": {"checked_out"},
    "checked_out": set(),
    "cancelled": set(),
    "rejected": set(),
}
ENQUIRY_TRANSITIONS = {
    "new": {"in_progress", "resolved", "closed"},
    "in_progress": {"resolved", "closed"},
    "resolved": {"in_progress", "closed"},
    "closed": set(),
}


async def list_admin_bookings(
    session: AsyncSession,
    page: int,
    page_size: int,
    query: str,
    status_filter: str | None,
) -> AdminBookingList:
    pattern = f"%{query.strip()}%"
    where = """
      where (:query = '' or b.booking_reference ilike :pattern
        or b.guest_name ilike :pattern or b.guest_email ilike :pattern
        or r.room_number ilike :pattern or c.name ilike :pattern)
        and (cast(:status as booking_status) is null or b.status = cast(:status as booking_status))
    """
    values = {"query": query.strip(), "pattern": pattern, "status": status_filter}
    total = (
        await session.execute(
            text(f"""
                select count(*) from public.bookings b
                join public.rooms r on r.id = b.room_id
                join public.room_categories c on c.id = r.category_id
                {where}
            """),
            values,
        )
    ).scalar_one()
    rows = (
        await session.execute(
            text(f"""
                {BOOKING_SELECT} {where}
                order by b.created_at desc limit :limit offset :offset
            """),
            {**values, "limit": page_size, "offset": (page - 1) * page_size},
        )
    ).mappings().all()
    return AdminBookingList(
        items=[BookingResponse.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        pages=ceil(total / page_size) if total else 0,
    )


async def transition_booking(
    session: AsyncSession,
    actor: AuthenticatedUser,
    booking_id: UUID,
    payload: BookingStatusUpdate,
) -> BookingResponse:
    current = (
        await session.execute(
            text("select status::text from public.bookings where id = :id for update"),
            {"id": booking_id},
        )
    ).scalar_one_or_none()
    if current is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if payload.status not in BOOKING_TRANSITIONS[current]:
        raise HTTPException(
            status_code=409,
            detail=f"Booking cannot move from {current} to {payload.status}",
        )
    await session.execute(
        text("update public.bookings set status = cast(:status as booking_status) where id = :id"),
        {"id": booking_id, "status": payload.status},
    )
    await session.execute(
        text("""
            insert into public.booking_status_history
              (booking_id, from_status, to_status, changed_by, reason)
            values (
              :id, cast(:from_status as booking_status), cast(:to_status as booking_status),
              :actor, :reason
            )
        """),
        {
            "id": booking_id,
            "from_status": current,
            "to_status": payload.status,
            "actor": actor.id,
            "reason": payload.reason,
        },
    )
    await session.commit()
    row = (
        await session.execute(text(f"{BOOKING_SELECT} where b.id = :id"), {"id": booking_id})
    ).mappings().one()
    return BookingResponse.model_validate(row)


async def list_admin_enquiries(
    session: AsyncSession,
    page: int,
    page_size: int,
    query: str,
    status_filter: str | None,
) -> AdminEnquiryList:
    where = """
      where (:query = '' or e.name ilike :pattern or e.email ilike :pattern
        or e.subject ilike :pattern or e.message ilike :pattern)
        and (cast(:status as enquiry_status) is null or e.status = cast(:status as enquiry_status))
    """
    values = {"query": query.strip(), "pattern": f"%{query.strip()}%", "status": status_filter}
    total = (
        await session.execute(text(f"select count(*) from public.enquiries e {where}"), values)
    ).scalar_one()
    rows = (
        await session.execute(
            text(f"""
                select e.id, e.user_id, e.name, e.email, e.phone, e.subject,
                  e.message, e.status::text, e.assigned_to, p.full_name as assigned_name,
                  e.admin_notes, e.created_at, e.updated_at
                from public.enquiries e left join public.profiles p on p.id = e.assigned_to
                {where} order by e.created_at desc limit :limit offset :offset
            """),
            {**values, "limit": page_size, "offset": (page - 1) * page_size},
        )
    ).mappings().all()
    return AdminEnquiryList(
        items=[EnquiryAdmin.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
        pages=ceil(total / page_size) if total else 0,
    )


async def update_enquiry(
    session: AsyncSession, enquiry_id: UUID, payload: EnquiryUpdate
) -> EnquiryAdmin:
    current = (
        await session.execute(
            text("select status::text from public.enquiries where id = :id for update"),
            {"id": enquiry_id},
        )
    ).scalar_one_or_none()
    if current is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if payload.status != current and payload.status not in ENQUIRY_TRANSITIONS[current]:
        raise HTTPException(
            status_code=409,
            detail=f"Enquiry cannot move from {current} to {payload.status}",
        )
    if payload.assigned_to is not None:
        is_admin = (
            await session.execute(
                text("""
                    select exists(select 1 from public.profiles
                    where id = :id and role = 'admin' and is_active)
                """),
                {"id": payload.assigned_to},
            )
        ).scalar_one()
        if not is_admin:
            raise HTTPException(status_code=422, detail="Assignee must be an active administrator")
    await session.execute(
        text("""
            update public.enquiries set status = cast(:status as enquiry_status),
              assigned_to = :assigned_to, admin_notes = :admin_notes where id = :id
        """),
        {"id": enquiry_id, **payload.model_dump()},
    )
    await session.commit()
    row = (
        await session.execute(
            text("""
                select e.id, e.user_id, e.name, e.email, e.phone, e.subject,
                  e.message, e.status::text, e.assigned_to, p.full_name as assigned_name,
                  e.admin_notes, e.created_at, e.updated_at from public.enquiries e
                left join public.profiles p on p.id=e.assigned_to where e.id=:id
            """),
            {"id": enquiry_id},
        )
    ).mappings().one()
    return EnquiryAdmin.model_validate(row)


async def list_admin_options(session: AsyncSession) -> list[AdminOption]:
    rows = (
        await session.execute(text("""
            select id, full_name from public.profiles
            where role = 'admin' and is_active order by full_name
        """))
    ).mappings().all()
    return [AdminOption.model_validate(row) for row in rows]
