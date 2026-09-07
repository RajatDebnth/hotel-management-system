from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.auth import require_admin, require_user
from app.schemas.auth import AuthenticatedUser

router = APIRouter(prefix="/auth", tags=["authentication"])


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
