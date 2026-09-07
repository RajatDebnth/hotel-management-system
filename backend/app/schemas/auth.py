from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr


class TokenClaims(BaseModel):
    sub: UUID
    email: EmailStr | None = None
    role: Literal["authenticated"]
    aud: str | list[str]
    exp: int
    iss: str


class AuthenticatedUser(BaseModel):
    id: UUID
    email: EmailStr | None = None
    role: Literal["customer", "admin"]

