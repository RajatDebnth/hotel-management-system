import secrets
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import BookingCreate, BookingListResponse, BookingResponse
from app.services.availability import validate_stay

MONEY = Decimal("0.01")
MVP_TAX_RATE = Decimal("0")

BOOKING_SELECT = """
select b.id, b.booking_reference, b.room_id, r.category_id, r.room_number,
       c.name as category_name, b.check_in, b.check_out, b.adult_count,
       b.child_count, b.guest_name, b.guest_email, b.guest_phone,
       b.price_per_night, b.night_count, b.subtotal, b.tax_amount,
       b.total_amount, b.status::text, b.special_requests, b.created_at
from public.bookings b
join public.rooms r on r.id = b.room_id
join public.room_categories c on c.id = r.category_id
"""


def calculate_price(
    price_per_night: Decimal,
    night_count: int,
    tax_rate: Decimal = MVP_TAX_RATE,
) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = (price_per_night * night_count).quantize(MONEY, rounding=ROUND_HALF_UP)
    tax_amount = (subtotal * tax_rate).quantize(MONEY, rounding=ROUND_HALF_UP)
    return subtotal, tax_amount, subtotal + tax_amount


async def create_booking(
    session: AsyncSession,
    user: AuthenticatedUser,
    payload: BookingCreate,
) -> BookingResponse:
    nights = validate_stay(payload.check_in, payload.check_out)
    guest_count = payload.adult_count + payload.child_count

    room = (
        await session.execute(
            text("""
                select r.id as room_id, r.room_number, c.id as category_id,
                       c.name as category_name, c.base_price, c.max_guests
                from public.rooms r
                join public.room_categories c on c.id = r.category_id
                where c.id = :category_id and c.is_active and r.status = 'active'
                  and not exists (
                    select 1 from public.bookings b
                    where b.room_id = r.id
                      and b.status in ('pending', 'confirmed', 'checked_in')
                      and daterange(b.check_in, b.check_out, '[)') &&
                          daterange(cast(:check_in as date), cast(:check_out as date), '[)')
                  )
                order by r.room_number
                for update of r skip locked
                limit 1
            """),
            {
                "category_id": payload.category_id,
                "check_in": payload.check_in,
                "check_out": payload.check_out,
            },
        )
    ).mappings().one_or_none()

    if room is None:
        category_capacity = (
            await session.execute(
                text("select max_guests from public.room_categories where id = :category_id"),
                {"category_id": payload.category_id},
            )
        ).scalar_one_or_none()
        if category_capacity is None:
            raise HTTPException(status_code=404, detail="Room category not found")
        if guest_count > category_capacity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"This room category allows at most {category_capacity} guests",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No room is available for the selected stay",
        )

    if guest_count > room["max_guests"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"This room category allows at most {room['max_guests']} guests",
        )

    subtotal, tax_amount, total_amount = calculate_price(room["base_price"], nights)
    values = {
        "booking_reference": f"HMS-{secrets.token_hex(6).upper()}",
        "user_id": user.id,
        "room_id": room["room_id"],
        "check_in": payload.check_in,
        "check_out": payload.check_out,
        "adult_count": payload.adult_count,
        "child_count": payload.child_count,
        "guest_name": payload.guest_name,
        "guest_email": str(payload.guest_email),
        "guest_phone": payload.guest_phone,
        "price_per_night": room["base_price"],
        "night_count": nights,
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "special_requests": payload.special_requests,
    }
    try:
        booking = (
            await session.execute(
                text("""
                    insert into public.bookings (
                      booking_reference, user_id, room_id, check_in, check_out,
                      adult_count, child_count, guest_name, guest_email, guest_phone,
                      price_per_night, night_count, subtotal, tax_amount, total_amount,
                      status, special_requests
                    ) values (
                      :booking_reference, :user_id, :room_id, :check_in, :check_out,
                      :adult_count, :child_count, :guest_name, :guest_email, :guest_phone,
                      :price_per_night, :night_count, :subtotal, :tax_amount, :total_amount,
                      'pending', :special_requests
                    )
                    returning id, booking_reference, room_id, check_in, check_out,
                              adult_count, child_count, guest_name, guest_email, guest_phone,
                              price_per_night, night_count, subtotal, tax_amount, total_amount,
                              status::text, special_requests, created_at
                """),
                values,
            )
        ).mappings().one()
        await session.execute(
            text("""
                insert into public.booking_status_history
                  (booking_id, from_status, to_status, changed_by, reason)
                values (:booking_id, null, 'pending', :user_id, 'Booking created')
            """),
            {"booking_id": booking["id"], "user_id": user.id},
        )
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The selected room is no longer available",
        ) from error

    return BookingResponse(
        **booking,
        category_id=room["category_id"],
        room_number=room["room_number"],
        category_name=room["category_name"],
    )


async def list_user_bookings(
    session: AsyncSession, user: AuthenticatedUser
) -> BookingListResponse:
    rows = (
        await session.execute(
            text(f"{BOOKING_SELECT} where b.user_id = :user_id order by b.created_at desc"),
            {"user_id": user.id},
        )
    ).mappings().all()
    return BookingListResponse(items=[BookingResponse.model_validate(row) for row in rows])


async def get_user_booking(
    session: AsyncSession, user: AuthenticatedUser, reference: str
) -> BookingResponse:
    row = (
        await session.execute(
            text(f"{BOOKING_SELECT} where b.user_id = :user_id and b.booking_reference = :ref"),
            {"user_id": user.id, "ref": reference},
        )
    ).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse.model_validate(row)


async def cancel_user_booking(
    session: AsyncSession, user: AuthenticatedUser, reference: str, reason: str
) -> BookingResponse:
    current = (
        await session.execute(
            text("""
                select id, status::text, check_in from public.bookings
                where user_id = :user_id and booking_reference = :ref for update
            """),
            {"user_id": user.id, "ref": reference},
        )
    ).mappings().one_or_none()
    if current is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current["status"] not in {"pending", "confirmed"}:
        raise HTTPException(status_code=409, detail="This booking can no longer be cancelled")
    if current["check_in"] <= date.today():
        raise HTTPException(
            status_code=409,
            detail="Bookings cannot be cancelled on or after check-in",
        )

    await session.execute(
        text("""
            update public.bookings set status = 'cancelled', cancelled_at = now(),
              cancellation_reason = :reason
            where id = :booking_id
        """),
        {"booking_id": current["id"], "reason": reason},
    )
    await session.execute(
        text("""
            insert into public.booking_status_history
              (booking_id, from_status, to_status, changed_by, reason)
            values (
              :booking_id, cast(:from_status as booking_status),
              'cancelled', :user_id, :reason
            )
        """),
        {
            "booking_id": current["id"],
            "from_status": current["status"],
            "user_id": user.id,
            "reason": reason,
        },
    )
    await session.commit()
    return await get_user_booking(session, user, reference)
