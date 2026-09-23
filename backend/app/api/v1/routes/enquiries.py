from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import SupabaseJWTVerifier, bearer_scheme, get_jwt_verifier
from app.db.session import get_db_session
from app.schemas.enquiry import EnquiryCreate, EnquiryCreated

router = APIRouter(prefix="/enquiries", tags=["enquiries"])


@router.post("", response_model=EnquiryCreated, status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    enquiry: EnquiryCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    verifier: Annotated[SupabaseJWTVerifier, Depends(get_jwt_verifier)],
) -> EnquiryCreated:
    user_id = None
    if credentials is not None:
        claims = await verifier.verify(credentials.credentials)
        user_id = claims.sub
    enquiry_id = (await session.execute(text("""
        insert into enquiries (user_id, name, email, phone, subject, message)
        values (:user_id, :name, :email, :phone, :subject, :message) returning id
    """), {"user_id": user_id, **enquiry.model_dump(exclude={"website"})})).scalar_one()
    await session.commit()
    return EnquiryCreated(id=enquiry_id)
