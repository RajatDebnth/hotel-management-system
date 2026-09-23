import os
import secrets
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt.exceptions import InvalidTokenError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.auth import AuthenticatedUser, TokenClaims

SESSION_ISSUER = "hms-local"
SESSION_AUDIENCE = "hms-local"


def get_or_create_signing_key(path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        key = path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        key = secrets.token_urlsafe(48)
        try:
            with path.open("x", encoding="utf-8") as handle:
                handle.write(key)
            with suppress(OSError):
                os.chmod(path, 0o600)
        except FileExistsError:
            key = path.read_text(encoding="utf-8").strip()
    if len(key) < 32:
        raise RuntimeError("Local session signing key is invalid")
    return key


class LocalSessionManager:
    def __init__(self, signing_key: str, lifetime_minutes: int = 480) -> None:
        self.signing_key = signing_key
        self.lifetime = timedelta(minutes=lifetime_minutes)

    def create(self, user: AuthenticatedUser, *, now: datetime | None = None) -> str:
        issued_at = now or datetime.now(UTC)
        return jwt.encode(
            {
                "sub": str(user.id),
                "email": str(user.email),
                "iat": issued_at,
                "exp": issued_at + self.lifetime,
                "iss": SESSION_ISSUER,
                "aud": SESSION_AUDIENCE,
            },
            self.signing_key,
            algorithm="HS256",
        )

    def verify(self, token: str) -> TokenClaims:
        try:
            payload = jwt.decode(
                token,
                self.signing_key,
                algorithms=["HS256"],
                audience=SESSION_AUDIENCE,
                issuer=SESSION_ISSUER,
                options={"require": ["sub", "email", "iat", "exp", "iss", "aud"]},
            )
            return TokenClaims.model_validate(payload)
        except (InvalidTokenError, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session",
            ) from error


@lru_cache
def get_session_manager() -> LocalSessionManager:
    settings = get_settings()
    return LocalSessionManager(
        get_or_create_signing_key(settings.secret_key_path),
        settings.session_lifetime_minutes,
    )


async def get_optional_claims(
    request: Request,
    manager: Annotated[LocalSessionManager, Depends(get_session_manager)],
) -> TokenClaims | None:
    token = request.cookies.get(get_settings().session_cookie_name)
    return manager.verify(token) if token else None


async def get_verified_claims(
    claims: Annotated[TokenClaims | None, Depends(get_optional_claims)],
) -> TokenClaims:
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return claims


async def require_user(
    claims: Annotated[TokenClaims, Depends(get_verified_claims)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AuthenticatedUser:
    row = (
        await session.execute(
            text("""select email, role from profiles
            where id = :user_id and is_active and email is not null"""),
            {"user_id": claims.sub},
        )
    ).mappings().one_or_none()
    if row is None or row["role"] not in {"customer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile is inactive or unavailable",
        )
    return AuthenticatedUser(id=claims.sub, email=row["email"], role=row["role"])


async def require_admin(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return user
