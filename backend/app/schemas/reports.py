from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.booking import BookingResponse


class DashboardSummary(BaseModel):
    report_date: date
    total_active_rooms: int
    occupied_rooms: int
    occupancy_percentage: Decimal
    arrivals: int
    departures: int
    pending_bookings: int
    open_enquiries: int
    arrival_bookings: list[BookingResponse]
    departure_bookings: list[BookingResponse]
    in_house_bookings: list[BookingResponse]
    recent_bookings: list[BookingResponse]


class OccupancyDay(BaseModel):
    date: date
    available_rooms: int
    occupied_rooms: int
    occupancy_percentage: Decimal


class OccupancyReport(BaseModel):
    start_date: date
    end_date: date
    available_room_nights: int
    occupied_room_nights: int
    occupancy_percentage: Decimal
    days: list[OccupancyDay]


class RevenueDay(BaseModel):
    date: date
    booked_revenue: Decimal


class RevenueReport(BaseModel):
    start_date: date
    end_date: date
    booked_revenue: Decimal
    days: list[RevenueDay]
