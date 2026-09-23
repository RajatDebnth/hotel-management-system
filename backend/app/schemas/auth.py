from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class TokenClaims(BaseModel):
    sub: UUID
    email: EmailStr
    aud: str
    exp: int
    iat: int
    iss: str


class AuthenticatedUser(BaseModel):
    id: UUID
    email: EmailStr | None = None
    role: Literal["customer", "admin"]


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least 2 characters")
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class AdminUser(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: Literal["customer", "admin"]
    is_active: bool


class RoleUpdateRequest(BaseModel):
    role: Literal["customer", "admin"]
