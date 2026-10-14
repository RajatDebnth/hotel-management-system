from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.passwords import hash_password
from app.db.session import get_db_session
from app.schemas.auth import (
    AdminCreateRequest,
    AdminUser,
    AuthenticatedUser,
    RoleUpdateRequest,
)

router = APIRouter(prefix="/admin/users", tags=["admin users"])


@router.get("", response_model=list[AdminUser])
async def list_users(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[AdminUser]:
    rows = (
        (
            await session.execute(
                text("""select id, email, full_name, role, is_active from profiles
            where email is not null order by lower(full_name), lower(email)""")
            )
        )
        .mappings()
        .all()
    )
    return [AdminUser.model_validate(row) for row in rows]


@router.post(
    "/administrators",
    response_model=AdminUser,
    status_code=status.HTTP_201_CREATED,
)
async def create_administrator(
    payload: AdminCreateRequest,
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminUser:
    administrator_id = uuid4()
    try:
        row = (
            (
                await session.execute(
                    text("""insert into profiles
                (id, email, password_hash, full_name, role)
                values (:id, :email, :password_hash, :full_name, 'admin')
                returning id, email, full_name, role, is_active"""),
                    {
                        "id": administrator_id,
                        "email": str(payload.email).lower(),
                        "password_hash": hash_password(payload.password),
                        "full_name": payload.full_name,
                    },
                )
            )
            .mappings()
            .one()
        )
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        ) from error
    return AdminUser.model_validate(row)


@router.patch("/{user_id}/role", response_model=AdminUser)
async def update_user_role(
    user_id: UUID,
    payload: RoleUpdateRequest,
    actor: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminUser:
    if user_id == actor.id:
        raise HTTPException(status_code=409, detail="Administrators cannot change their own role")
    current = (
        await session.execute(
            text("select role from profiles where id = :id and email is not null"),
            {"id": user_id},
        )
    ).scalar_one_or_none()
    if current is None:
        raise HTTPException(status_code=404, detail="User not found")
    if current == "customer" and payload.role == "admin":
        raise HTTPException(
            status_code=409,
            detail=(
                "Visitor accounts cannot be promoted. "
                "Create a separate administrator account instead."
            ),
        )
    if current == "admin" and payload.role == "customer":
        admin_count = (
            await session.execute(
                text("select count(*) from profiles where role = 'admin' and is_active")
            )
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="At least one administrator is required")
    row = (
        (
            await session.execute(
                text("""update profiles set role = :role, updated_at = current_timestamp
            where id = :id returning id, email, full_name, role, is_active"""),
                {"id": user_id, "role": payload.role},
            )
        )
        .mappings()
        .one()
    )
    await session.commit()
    return AdminUser.model_validate(row)
