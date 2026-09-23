from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_optional_claims
from app.db.session import get_db_session
from app.schemas.auth import TokenClaims
from app.schemas.enquiry import EnquiryCreate, EnquiryCreated

router = APIRouter(prefix="/enquiries", tags=["enquiries"])


@router.post("", response_model=EnquiryCreated, status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    enquiry: EnquiryCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    claims: Annotated[TokenClaims | None, Depends(get_optional_claims)],
) -> EnquiryCreated:
    user_id = claims.sub if claims is not None else None
    enquiry_id = (await session.execute(text("""
        insert into enquiries (user_id, name, email, phone, subject, message)
        values (:user_id, :name, :email, :phone, :subject, :message) returning id
    """), {"user_id": user_id, **enquiry.model_dump(exclude={"website"})})).scalar_one()
    await session.commit()
    return EnquiryCreated(id=enquiry_id)
