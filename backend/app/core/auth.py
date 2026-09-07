from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.auth import AuthenticatedUser, TokenClaims

bearer_scheme = HTTPBearer(auto_error=False)


class SupabaseJWTVerifier:
    def __init__(self, supabase_url: str) -> None:
        self.issuer = f"{supabase_url.rstrip('/')}/auth/v1"
        self.jwks_client = PyJWKClient(
            f"{self.issuer}/.well-known/jwks.json",
            cache_keys=True,
            lifespan=600,
        )

    async def verify(self, token: str) -> TokenClaims:
        try:
            signing_key = await run_in_threadpool(
                self.jwks_client.get_signing_key_from_jwt,
                token,
            )
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                issuer=self.issuer,
                options={"require": ["exp", "iss", "aud", "sub", "role"]},
            )
            return TokenClaims.model_validate(payload)
        except (InvalidTokenError, PyJWKClientError, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error


@lru_cache
def get_jwt_verifier() -> SupabaseJWTVerifier:
    supabase_url = get_settings().supabase_url
    if supabase_url is None:
        raise RuntimeError("SUPABASE_URL is required for authenticated endpoints")
    return SupabaseJWTVerifier(str(supabase_url))


async def get_verified_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    verifier: Annotated[SupabaseJWTVerifier, Depends(get_jwt_verifier)],
) -> TokenClaims:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await verifier.verify(credentials.credentials)


async def require_user(
    claims: Annotated[TokenClaims, Depends(get_verified_claims)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AuthenticatedUser:
    result = await session.execute(
        text("select role::text from public.profiles where id = :user_id and is_active"),
        {"user_id": claims.sub},
    )
    role = result.scalar_one_or_none()
    if role not in {"customer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile is inactive or unavailable",
        )
    return AuthenticatedUser(id=claims.sub, email=claims.email, role=role)


async def require_admin(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return user
