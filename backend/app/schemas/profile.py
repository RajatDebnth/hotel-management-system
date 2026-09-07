from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class ProfileResponse(BaseModel):
    id: UUID
    email: EmailStr | None
    full_name: str
    phone: str | None
    avatar_path: str | None
    role: Literal["customer", "admin"]


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least 2 characters")
        return normalized

    @field_validator("phone")
    @classmethod
    def strip_phone(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None
