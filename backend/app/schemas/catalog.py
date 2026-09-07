from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FacilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    icon: str | None
    description: str


class RoomImageResponse(BaseModel):
    id: UUID
    url: str
    alt_text: str
    sort_order: int
    is_cover: bool


class RoomCategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    base_price: Decimal
    max_guests: int
    bed_type: str
    room_size_sq_m: Decimal | None
    available_room_count: int = Field(ge=0)
    facilities: list[FacilityResponse] = Field(default_factory=list)
    images: list[RoomImageResponse] = Field(default_factory=list)


class RoomCategoryListResponse(BaseModel):
    items: list[RoomCategoryResponse]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)
    pages: int = Field(ge=0)


class AvailabilityResponse(BaseModel):
    check_in: date
    check_out: date
    nights: int = Field(ge=1)
    guests: int = Field(ge=1)
    items: list[RoomCategoryResponse]
