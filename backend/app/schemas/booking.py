from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class BookingCreate(BaseModel):
    category_id: UUID
    check_in: date
    check_out: date
    adult_count: int = Field(ge=1, le=20)
    child_count: int = Field(default=0, ge=0, le=20)
    guest_name: str = Field(min_length=2, max_length=120)
    guest_email: EmailStr
    guest_phone: str = Field(min_length=6, max_length=30)
    special_requests: str | None = Field(default=None, max_length=2000)

    @field_validator("guest_name", "guest_phone")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be blank")
        return normalized

    @field_validator("special_requests")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


class BookingResponse(BaseModel):
    id: UUID
    booking_reference: str
    room_id: UUID
    category_id: UUID
    room_number: str
    category_name: str
    check_in: date
    check_out: date
    adult_count: int
    child_count: int
    guest_name: str
    guest_email: EmailStr
    guest_phone: str
    price_per_night: Decimal
    night_count: int
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: str
    special_requests: str | None
    created_at: datetime


class BookingListResponse(BaseModel):
    items: list[BookingResponse]


class BookingCancellation(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Cancellation reason must contain at least 3 characters")
        return normalized
