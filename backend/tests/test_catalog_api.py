from collections.abc import AsyncIterator
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.api.v1.routes import catalog as catalog_routes
from app.core.auth import get_jwt_verifier
from app.db.session import get_db_session
from app.main import app
from app.schemas.catalog import RoomCategoryListResponse, RoomCategoryResponse


async def fake_session() -> AsyncIterator[object]:
    yield object()


def category() -> RoomCategoryResponse:
    return RoomCategoryResponse(
        id=UUID("10000000-0000-0000-0000-000000000001"),
        name="Deluxe King",
        slug="deluxe-king",
        description="A spacious king room.",
        base_price=Decimal("5200.00"),
        max_guests=2,
        bed_type="King",
        room_size_sq_m=Decimal("32.00"),
        available_room_count=2,
    )


def test_catalog_list_passes_pagination_and_search(monkeypatch) -> None:
    service = AsyncMock(
        return_value=RoomCategoryListResponse(
            items=[category()], page=2, page_size=1, total=3, pages=3
        )
    )
    monkeypatch.setattr(catalog_routes, "list_categories", service)
    app.dependency_overrides[get_db_session] = fake_session
    try:
        response = TestClient(app).get("/api/v1/catalog/rooms?page=2&page_size=1&q=king")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["slug"] == "deluxe-king"
    assert service.await_args.args[1:] == (2, 1, "king")
    assert service.await_args.kwargs == {
        "check_in": None,
        "check_out": None,
        "guests": None,
        "min_price": None,
        "max_price": None,
        "category": "",
    }


def test_catalog_rejects_invalid_page_size() -> None:
    response = TestClient(app).get("/api/v1/catalog/rooms?page_size=101")

    assert response.status_code == 422


def test_catalog_rejects_partial_dates_and_inverted_prices() -> None:
    today = date.today().isoformat()
    partial = TestClient(app).get(f"/api/v1/catalog/rooms?check_in={today}")
    prices = TestClient(app).get("/api/v1/catalog/rooms?min_price=9000&max_price=100")

    assert partial.status_code == 422
    assert prices.status_code == 422


def test_availability_returns_canonical_night_count(monkeypatch) -> None:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=3)
    service = AsyncMock(
        return_value=RoomCategoryListResponse(
            items=[category()], page=1, page_size=100, total=1, pages=1
        )
    )
    monkeypatch.setattr(catalog_routes, "list_categories", service)
    app.dependency_overrides[get_db_session] = fake_session
    try:
        response = TestClient(app).get(
            f"/api/v1/catalog/availability?check_in={start}&check_out={end}&guests=2"
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["nights"] == 3
    assert response.json()["items"][0]["slug"] == "deluxe-king"


class ScalarResult:
    def __init__(self, value: UUID) -> None:
        self.value = value

    def scalar_one(self) -> UUID:
        return self.value


class EnquirySession:
    def __init__(self) -> None:
        self.values: dict[str, object] = {}
        self.committed = False

    async def execute(self, statement: object, values: dict[str, object]) -> ScalarResult:
        self.values = values
        return ScalarResult(uuid4())

    async def commit(self) -> None:
        self.committed = True


async def unused_verifier() -> object:
    return object()


def test_anonymous_enquiry_is_validated_and_created() -> None:
    session = EnquirySession()

    async def session_override() -> AsyncIterator[EnquirySession]:
        yield session

    app.dependency_overrides[get_db_session] = session_override
    app.dependency_overrides[get_jwt_verifier] = unused_verifier
    try:
        response = TestClient(app).post(
            "/api/v1/enquiries",
            json={
                "name": "  Guest Name  ",
                "email": "guest@example.com",
                "subject": "A future stay",
                "message": "  Could you arrange a late arrival?  ",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert session.committed
    assert session.values["user_id"] is None
    assert session.values["name"] == "Guest Name"
    assert session.values["message"] == "Could you arrange a late arrival?"


def test_enquiry_rejects_honeypot_and_invalid_email() -> None:
    response = TestClient(app).post(
        "/api/v1/enquiries",
        json={
            "name": "Guest",
            "email": "not-an-email",
            "subject": "Question",
            "message": "Hello",
            "website": "spam.example",
        },
    )

    assert response.status_code == 422
