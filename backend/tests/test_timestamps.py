from datetime import UTC, datetime

from app.schemas.admin_operations import EnquiryAdmin
from app.schemas.auth import AdminVisitor
from app.schemas.booking import BookingResponse


def test_sqlite_timestamps_are_exposed_as_utc() -> None:
    naive = datetime(2026, 10, 16, 7, 48, 35)
    booking = BookingResponse(
        id="10000000-0000-0000-0000-000000000001",
        booking_reference="HMS-TIME",
        room_id="30000000-0000-0000-0000-000000000101",
        category_id="10000000-0000-0000-0000-000000000001",
        room_number="101",
        category_name="Deluxe King",
        check_in="2026-10-20",
        check_out="2026-10-21",
        adult_count=1,
        child_count=0,
        guest_name="Time Guest",
        guest_email="time@example.com",
        guest_phone="9876543210",
        price_per_night="5200.00",
        night_count=1,
        subtotal="5200.00",
        tax_amount="0.00",
        total_amount="5200.00",
        status="pending",
        special_requests=None,
        created_at=naive,
    )
    enquiry = EnquiryAdmin(
        id="40000000-0000-0000-0000-000000000001",
        user_id=None,
        name="Time Guest",
        email="time@example.com",
        phone=None,
        subject="Arrival time",
        message="What time is check-in?",
        status="new",
        assigned_to=None,
        assigned_name=None,
        admin_notes=None,
        created_at=naive,
        updated_at=naive,
    )
    visitor = AdminVisitor(
        id="50000000-0000-0000-0000-000000000001",
        email="time@example.com",
        emails=["time@example.com"],
        full_name="Time Guest",
        phone=None,
        is_active=True,
        created_at=naive,
        account_count=1,
        bookings=[booking],
    )

    assert booking.created_at.tzinfo is UTC
    assert enquiry.created_at.tzinfo is UTC
    assert enquiry.updated_at.tzinfo is UTC
    assert visitor.created_at.tzinfo is UTC
    assert '"created_at":"2026-10-16T07:48:35Z"' in booking.model_dump_json()
