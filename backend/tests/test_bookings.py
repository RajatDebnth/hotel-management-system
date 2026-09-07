from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.v1.routes import bookings as booking_routes
from app.core.auth import require_user
from app.db.session import get_db_session
from app.main import app
from app.schemas.auth import AuthenticatedUser
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.bookings import calculate_price, cancel_user_booking, create_booking

CUSTOMER = AuthenticatedUser(
    id=UUID("40000000-0000-0000-0000-000000000001"),
    email="guest@example.com",
    role="customer",
)
CATEGORY_ID = UUID("10000000-0000-0000-0000-000000000001")


def payload(start: date, end: date, adults: int = 1) -> dict[str, object]:
    return {
        "category_id": str(CATEGORY_ID),
        "check_in": start.isoformat(),
        "check_out": end.isoformat(),
        "adult_count": adults,
        "child_count": 0,
        "guest_name": "Guest Name",
        "guest_email": "guest@example.com",
        "guest_phone": "+91 98765 43210",
    }


def test_calculate_price_uses_immutable_decimal_snapshot() -> None:
    assert calculate_price(Decimal("5200.00"), 3) == (
        Decimal("15600.00"), Decimal("0.00"), Decimal("15600.00")
    )
    assert calculate_price(Decimal("99.99"), 2, Decimal("0.18")) == (
        Decimal("199.98"), Decimal("36.00"), Decimal("235.98")
    )


def test_booking_requires_authentication() -> None:
    response = TestClient(app).post(
        "/api/v1/bookings",
        json=payload(date.today() + timedelta(days=1), date.today() + timedelta(days=2)),
    )
    assert response.status_code == 401


def test_valid_booking_returns_reference(monkeypatch) -> None:
    start = date.today() + timedelta(days=1)
    response_model = BookingResponse(
        id=UUID("50000000-0000-0000-0000-000000000001"),
        booking_reference="HMS-ABCDEF123456",
        room_id=UUID("20000000-0000-0000-0000-000000000001"),
        category_id=CATEGORY_ID,
        room_number="101",
        category_name="Deluxe King",
        check_in=start,
        check_out=start + timedelta(days=2),
        adult_count=1,
        child_count=0,
        guest_name="Guest Name",
        guest_email="guest@example.com",
        guest_phone="+91 98765 43210",
        price_per_night=Decimal("5200.00"),
        night_count=2,
        subtotal=Decimal("10400.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("10400.00"),
        status="pending",
        special_requests=None,
        created_at="2026-09-07T00:00:00Z",
    )
    service = AsyncMock(return_value=response_model)
    monkeypatch.setattr(booking_routes, "create_booking", service)

    async def user_override() -> AuthenticatedUser:
        return CUSTOMER

    async def session_override():
        yield object()

    app.dependency_overrides[require_user] = user_override
    app.dependency_overrides[get_db_session] = session_override
    try:
        response = TestClient(app).post(
            "/api/v1/bookings", json=payload(start, start + timedelta(days=2))
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["booking_reference"] == "HMS-ABCDEF123456"


@pytest.mark.asyncio
async def test_invalid_dates_are_rejected_before_database_access() -> None:
    start = date.today() + timedelta(days=2)
    request = booking_routes.BookingCreate.model_validate(payload(start, start))
    with pytest.raises(HTTPException) as error:
        await create_booking(AsyncMock(), CUSTOMER, request)
    assert error.value.status_code == 422


def test_booking_payload_rejects_excessive_declared_guest_counts() -> None:
    start = date.today() + timedelta(days=1)
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(payload(start, start + timedelta(days=1), adults=21))


class MappingResult:
    def __init__(self, row: dict[str, object] | None) -> None:
        self.row = row

    def mappings(self) -> "MappingResult":
        return self

    def one_or_none(self) -> dict[str, object] | None:
        return self.row


class CancellationSession:
    def __init__(self, row: dict[str, object] | None) -> None:
        self.row = row
        self.committed = False

    async def execute(self, statement: object, values: dict[str, object]) -> MappingResult:
        return MappingResult(self.row)

    async def commit(self) -> None:
        self.committed = True


@pytest.mark.asyncio
async def test_customer_cannot_cancel_another_users_booking() -> None:
    session = CancellationSession(None)
    with pytest.raises(HTTPException) as error:
        await cancel_user_booking(session, CUSTOMER, "HMS-NOTMINE123", "Plans changed")
    assert error.value.status_code == 404
    assert not session.committed


@pytest.mark.asyncio
async def test_checked_in_booking_cannot_be_cancelled() -> None:
    session = CancellationSession({
        "id": UUID("50000000-0000-0000-0000-000000000001"),
        "status": "checked_in",
        "check_in": date.today(),
    })
    with pytest.raises(HTTPException) as error:
        await cancel_user_booking(session, CUSTOMER, "HMS-CHECKEDIN1", "Plans changed")
    assert error.value.status_code == 409
    assert not session.committed
