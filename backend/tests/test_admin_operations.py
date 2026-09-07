from uuid import UUID

import pytest
from fastapi import HTTPException

from app.schemas.admin_operations import BookingStatusUpdate, EnquiryUpdate
from app.schemas.auth import AuthenticatedUser
from app.services.admin_operations import transition_booking, update_enquiry

ADMIN = AuthenticatedUser(
    id=UUID("40000000-0000-0000-0000-000000000002"),
    email="admin@example.com",
    role="admin",
)


class ScalarResult:
    def __init__(self, value: object) -> None:
        self.value = value

    def scalar_one_or_none(self) -> object:
        return self.value


class CurrentStateSession:
    def __init__(self, value: str) -> None:
        self.value = value
        self.calls = 0

    async def execute(self, statement: object, values: dict[str, object]) -> ScalarResult:
        self.calls += 1
        return ScalarResult(self.value)


@pytest.mark.asyncio
async def test_invalid_booking_transition_is_rejected_without_write() -> None:
    session = CurrentStateSession("pending")
    with pytest.raises(HTTPException) as error:
        await transition_booking(
            session,
            ADMIN,
            UUID("50000000-0000-0000-0000-000000000001"),
            BookingStatusUpdate(status="checked_out", reason="Invalid shortcut"),
        )
    assert error.value.status_code == 409
    assert session.calls == 1


@pytest.mark.asyncio
async def test_closed_enquiry_cannot_be_reopened() -> None:
    session = CurrentStateSession("closed")
    with pytest.raises(HTTPException) as error:
        await update_enquiry(
            session,
            UUID("60000000-0000-0000-0000-000000000001"),
            EnquiryUpdate(status="in_progress", admin_notes="Reopen"),
        )
    assert error.value.status_code == 409
    assert session.calls == 1
