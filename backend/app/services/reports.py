from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.booking import BookingResponse
from app.schemas.reports import (
    DashboardSummary,
    OccupancyDay,
    OccupancyReport,
    RevenueDay,
    RevenueReport,
)
from app.services.bookings import BOOKING_SELECT

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
                  (select count(*) from public.rooms where status = 'active')::int
                    as total_active_rooms,
                  (select count(distinct b.room_id) from public.bookings b
                    join public.rooms r on r.id = b.room_id and r.status = 'active'
                    where b.status in {REPORT_STATUSES}
                      and b.check_in <= :today and b.check_out > :today)::int
                    as occupied_rooms,
                  (select count(*) from public.bookings
                    where status in ('confirmed', 'checked_in') and check_in = :today)::int
                    as arrivals,
                  (select count(*) from public.bookings
                    where status in ('checked_in', 'checked_out') and check_out = :today)::int
                    as departures,
                  (select count(*) from public.bookings where status = 'pending')::int
                    as pending_bookings,
                  (select count(*) from public.enquiries
                    where status in ('new', 'in_progress'))::int as open_enquiries
            """),
            {"today": report_date},
        )
    ).mappings().one()
    recent = (
        await session.execute(text(f"{BOOKING_SELECT} order by b.created_at desc limit 5"))
    ).mappings().all()
    return DashboardSummary(
        **totals,
        report_date=report_date,
        occupancy_percentage=percentage(totals["occupied_rooms"], totals["total_active_rooms"]),
        recent_bookings=[BookingResponse.model_validate(row) for row in recent],
    )


async def occupancy_report(
    session: AsyncSession, start_date: date, end_date: date
) -> OccupancyReport:
    validate_report_range(start_date, end_date)
    rows = (
        await session.execute(
            text(f"""
                with days as (
                  select day::date from generate_series(
                    cast(:start_date as date), cast(:end_date as date) - 1, interval '1 day'
                  ) day
                ), room_total as (
                  select count(*)::int as count from public.rooms where status = 'active'
                )
                select d.day as date, rt.count as available_rooms,
                  count(distinct b.room_id)::int as occupied_rooms
                from days d cross join room_total rt
                left join public.bookings b on b.status in {REPORT_STATUSES}
                  and b.check_in <= d.day and b.check_out > d.day
                  and exists (
                    select 1 from public.rooms r
                    where r.id = b.room_id and r.status = 'active'
                  )
                group by d.day, rt.count order by d.day
            """),
            {"start_date": start_date, "end_date": end_date},
        )
    ).mappings().all()
    days = [
        OccupancyDay(
            **row,
            occupancy_percentage=percentage(row["occupied_rooms"], row["available_rooms"]),
        )
        for row in rows
    ]
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
    validate_report_range(start_date, end_date)
    rows = (
        await session.execute(
            text(f"""
                with days as (
                  select day::date from generate_series(
                    cast(:start_date as date), cast(:end_date as date) - 1, interval '1 day'
                  ) day
                )
                select d.day as date,
                  coalesce(sum(b.price_per_night), 0)::numeric(12,2) as booked_revenue
                from days d left join public.bookings b on b.status in {REPORT_STATUSES}
                  and b.check_in <= d.day and b.check_out > d.day
                group by d.day order by d.day
            """),
            {"start_date": start_date, "end_date": end_date},
        )
    ).mappings().all()
    days = [RevenueDay.model_validate(row) for row in rows]
    return RevenueReport(
        start_date=start_date,
        end_date=end_date,
        booked_revenue=sum((item.booked_revenue for item in days), Decimal("0.00")),
        days=days,
    )
