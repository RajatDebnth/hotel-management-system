from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.db.session import get_db_session
from app.schemas.auth import AdminUser, AuthenticatedUser, RoleUpdateRequest

router = APIRouter(prefix="/admin/users", tags=["admin users"])


@router.get("", response_model=list[AdminUser])
async def list_users(
    _: Annotated[AuthenticatedUser, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[AdminUser]:
    rows = (
        await session.execute(
            text("""select id, email, full_name, role, is_active from profiles
            where email is not null order by lower(full_name), lower(email)""")
        )
    ).mappings().all()
    return [AdminUser.model_validate(row) for row in rows]


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
    if current == "admin" and payload.role == "customer":
        admin_count = (
            await session.execute(
                text("select count(*) from profiles where role = 'admin' and is_active")
            )
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="At least one administrator is required")
    row = (
        await session.execute(
            text("""update profiles set role = :role, updated_at = current_timestamp
            where id = :id returning id, email, full_name, role, is_active"""),
            {"id": user_id, "role": payload.role},
        )
    ).mappings().one()
    await session.commit()
    return AdminUser.model_validate(row)
