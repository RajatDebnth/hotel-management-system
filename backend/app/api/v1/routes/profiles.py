from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_user
from app.db.session import get_db_session
from app.schemas.auth import AuthenticatedUser
from app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/me", tags=["customer"])


@router.get("", response_model=ProfileResponse)
async def profile(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProfileResponse:
    row = (
        await session.execute(
            text("""
                select id, full_name, phone, avatar_path, role::text
                from public.profiles where id = :id
            """),
            {"id": user.id},
        )
    ).mappings().one()
    return ProfileResponse(**row, email=user.email)


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    user: Annotated[AuthenticatedUser, Depends(require_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProfileResponse:
    row = (
        await session.execute(
            text("""
                update public.profiles set full_name = :full_name, phone = :phone
                where id = :id
                returning id, full_name, phone, avatar_path, role::text
            """),
            {"id": user.id, "full_name": payload.full_name, "phone": payload.phone},
        )
    ).mappings().one()
    await session.commit()
    return ProfileResponse(**row, email=user.email)
