from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class EnquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
    website: str | None = Field(default=None, max_length=0, exclude=True)

    @field_validator("name", "subject", "message")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class EnquiryCreated(BaseModel):
    id: UUID
    message: str = "Thank you. The house team will be in touch soon."
