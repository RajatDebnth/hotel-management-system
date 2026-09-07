from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.booking import BookingResponse

BookingStatus = Literal[
    "pending", "confirmed", "checked_in", "checked_out", "cancelled", "rejected"
]
EnquiryStatus = Literal["new", "in_progress", "resolved", "closed"]


class AdminBookingList(BaseModel):
    items: list[BookingResponse]
    page: int
    page_size: int
    total: int
    pages: int


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Reason must contain at least 3 characters")
        return normalized


class EnquiryAdmin(BaseModel):
    id: UUID
    user_id: UUID | None
    name: str
    email: EmailStr
    phone: str | None
    subject: str
    message: str
    status: EnquiryStatus
    assigned_to: UUID | None
    assigned_name: str | None
    admin_notes: str | None
    created_at: datetime
    updated_at: datetime


class AdminEnquiryList(BaseModel):
    items: list[EnquiryAdmin]
    page: int
    page_size: int
    total: int
    pages: int


class EnquiryUpdate(BaseModel):
    status: EnquiryStatus
    assigned_to: UUID | None = None
    admin_notes: str | None = Field(default=None, max_length=5000)

    @field_validator("admin_notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


class AdminOption(BaseModel):
    id: UUID
    full_name: str
