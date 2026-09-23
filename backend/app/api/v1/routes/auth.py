from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import LocalSessionManager, get_session_manager, require_admin, require_user
from app.core.config import get_settings
from app.core.passwords import hash_password, verify_password
from app.db.session import get_db_session
from app.schemas.auth import (
    AuthenticatedUser,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
DUMMY_PASSWORD_HASH = hash_password(
    "dummy-password-for-timing-only", salt=b"local-auth-dummy"
)


def set_session_cookie(
    response: Response, manager: LocalSessionManager, user: AuthenticatedUser
) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        manager.create(user),
        max_age=settings.session_lifetime_minutes * 60,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=AuthenticatedUser, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    manager: Annotated[LocalSessionManager, Depends(get_session_manager)],
) -> AuthenticatedUser:
    user = AuthenticatedUser(
        id=uuid4(), email=str(payload.email).lower(), role="customer"
    )
    try:
        await session.execute(
            text("""insert into profiles
            (id, email, password_hash, full_name, role)
            values (:id, :email, :password_hash, :full_name, 'customer')"""),
            {
                "id": user.id,
                "email": str(user.email),
                "password_hash": hash_password(payload.password),
                "full_name": payload.full_name,
            },
        )
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409, detail="An account with this email already exists"
        ) from error
    set_session_cookie(response, manager, user)
    return user


@router.post("/login", response_model=AuthenticatedUser)
async def login(
    payload: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    manager: Annotated[LocalSessionManager, Depends(get_session_manager)],
) -> AuthenticatedUser:
    row = (
        await session.execute(
            text("""select id, email, password_hash, role, is_active from profiles
            where lower(email) = lower(:email)"""),
            {"email": str(payload.email)},
        )
    ).mappings().one_or_none()
    encoded = row["password_hash"] if row and row["password_hash"] else DUMMY_PASSWORD_HASH
    valid = verify_password(payload.password, encoded)
    if row is None or not valid or not row["is_active"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = AuthenticatedUser(id=row["id"], email=row["email"], role=row["role"])
    set_session_cookie(response, manager, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> Response:
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChangeRequest,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    encoded = (
        await session.execute(
            text("select password_hash from profiles where id = :id"), {"id": user.id}
        )
    ).scalar_one_or_none()
    if encoded is None or not verify_password(payload.current_password, encoded):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=422, detail="New password must be different")
    await session.execute(
        text("""update profiles set password_hash = :password_hash,
        updated_at = current_timestamp where id = :id"""),
        {"id": user.id, "password_hash": hash_password(payload.new_password)},
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AuthenticatedUser)
async def current_user(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
) -> AuthenticatedUser:
    return user


@router.get("/admin-check", response_model=AuthenticatedUser)
async def admin_check(
    user: Annotated[AuthenticatedUser, Depends(require_admin)],
) -> AuthenticatedUser:
    return user
