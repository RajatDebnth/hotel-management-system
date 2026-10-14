from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.money import from_paise
from app.schemas.booking import BookingResponse
from app.schemas.reports import (
    DashboardSummary,
    OccupancyDay,
    OccupancyReport,
    RevenueDay,
    RevenueReport,
)
from app.services.bookings import BOOKING_SELECT, booking_values

REPORT_STATUSES = "('confirmed', 'checked_in', 'checked_out')"


def validate_report_range(start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days
    if days < 1:
        raise HTTPException(status_code=422, detail="End date must be after start date")
    if days > 366:
        raise HTTPException(status_code=422, detail="Report range cannot exceed 366 days")
    return days


def percentage(numerator: int, denominator: int) -> Decimal:
    if denominator == 0:
        return Decimal("0.00")
    return (Decimal(numerator) * 100 / Decimal(denominator)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


async def dashboard_summary(session: AsyncSession, report_date: date) -> DashboardSummary:
    totals = (
        await session.execute(
            text(f"""
                select
                  (select count(*) from rooms where status = 'active')
                    as total_active_rooms,
                  (select count(distinct b.room_id) from bookings b
                    join rooms r on r.id = b.room_id and r.status = 'active'
                    where b.status in {REPORT_STATUSES}
                      and b.check_in <= :today and b.check_out > :today)
                    as occupied_rooms,
                  (select count(*) from bookings
                    where status in ('confirmed', 'checked_in') and check_in = :today)
                    as arrivals,
                  (select count(*) from bookings
                    where status in ('checked_in', 'checked_out') and check_out = :today)
                    as departures,
                  (select count(*) from bookings where status = 'pending')
                    as pending_bookings,
                  (select count(*) from enquiries
                    where status in ('new', 'in_progress')) as open_enquiries
            """),
            {"today": report_date},
        )
    ).mappings().one()
    async def booking_list(where: str, *, limit: int = 8):
        return (
            await session.execute(
                text(
                    f"{BOOKING_SELECT} where {where} "
                    "order by b.check_in, b.created_at limit :limit"
                ),
                {"today": report_date, "limit": limit},
            )
        ).mappings().all()

    arrivals = await booking_list(
        "b.status in ('confirmed', 'checked_in') and b.check_in = :today"
    )
    departures = await booking_list(
        "b.status in ('checked_in', 'checked_out') and b.check_out = :today"
    )
    in_house = await booking_list(
        "b.status = 'checked_in' and b.check_in <= :today and b.check_out > :today"
    )
    recent = (
        await session.execute(text(f"{BOOKING_SELECT} order by b.created_at desc limit 5"))
    ).mappings().all()
    return DashboardSummary(
        **totals,
        report_date=report_date,
        occupancy_percentage=percentage(totals["occupied_rooms"], totals["total_active_rooms"]),
        arrival_bookings=[BookingResponse.model_validate(booking_values(row)) for row in arrivals],
        departure_bookings=[
            BookingResponse.model_validate(booking_values(row)) for row in departures
        ],
        in_house_bookings=[
            BookingResponse.model_validate(booking_values(row)) for row in in_house
        ],
        recent_bookings=[BookingResponse.model_validate(booking_values(row)) for row in recent],
    )


async def occupancy_report(
    session: AsyncSession, start_date: date, end_date: date
) -> OccupancyReport:
    day_count = validate_report_range(start_date, end_date)
    available_rooms = (
        await session.execute(text("select count(*) from rooms where status = 'active'"))
    ).scalar_one()
    days: list[OccupancyDay] = []
    for offset in range(day_count):
        report_day = start_date + timedelta(days=offset)
        occupied_rooms = (
            await session.execute(
                text(f"""
                    select count(distinct b.room_id) from bookings b
                    join rooms r on r.id = b.room_id and r.status = 'active'
                    where b.status in {REPORT_STATUSES}
                      and b.check_in <= :day and b.check_out > :day
                """),
                {"day": report_day},
            )
        ).scalar_one()
        days.append(
            OccupancyDay(
                date=report_day,
                available_rooms=available_rooms,
                occupied_rooms=occupied_rooms,
                occupancy_percentage=percentage(occupied_rooms, available_rooms),
            )
        )
    available = sum(item.available_rooms for item in days)
    occupied = sum(item.occupied_rooms for item in days)
    return OccupancyReport(
        start_date=start_date,
        end_date=end_date,
        available_room_nights=available,
        occupied_room_nights=occupied,
        occupancy_percentage=percentage(occupied, available),
        days=days,
    )


async def revenue_report(
    session: AsyncSession, start_date: date, end_date: date
) -> RevenueReport:
    day_count = validate_report_range(start_date, end_date)
    days: list[RevenueDay] = []
    for offset in range(day_count):
        report_day = start_date + timedelta(days=offset)
        revenue = (
            await session.execute(
                text(f"""
                    select coalesce(sum(price_per_night), 0) from bookings
                    where status in {REPORT_STATUSES}
                      and check_in <= :day and check_out > :day
                """),
                {"day": report_day},
            )
        ).scalar_one()
        days.append(RevenueDay(date=report_day, booked_revenue=from_paise(revenue)))
    return RevenueReport(
        start_date=start_date,
        end_date=end_date,
        booked_revenue=sum((item.booked_revenue for item in days), Decimal("0.00")),
        days=days,
    )
