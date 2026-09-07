from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryWrite(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    description: str = Field(default="", max_length=5000)
    base_price: Decimal = Field(ge=0)
    max_guests: int = Field(ge=1, le=20)
    bed_type: str = Field(min_length=1, max_length=100)
    room_size_sq_m: Decimal | None = Field(default=None, gt=0)
    is_active: bool = True


class CategoryAdmin(CategoryWrite):
    id: UUID


class RoomWrite(BaseModel):
    room_number: str = Field(min_length=1, max_length=30)
    category_id: UUID
    floor: int | None = Field(default=None, ge=-10, le=200)
    description: str = Field(default="", max_length=5000)
    status: Literal["active", "maintenance", "inactive"] = "active"


class RoomAdmin(RoomWrite):
    id: UUID
    category_name: str


class FacilityWrite(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    description: str = Field(default="", max_length=2000)
    is_active: bool = True


class FacilityAdmin(FacilityWrite):
    id: UUID


class ImageAdmin(BaseModel):
    id: UUID
    room_id: UUID | None
    category_id: UUID | None
    storage_path: str
    url: str
    alt_text: str
    sort_order: int
    is_cover: bool


class ImageUpdate(BaseModel):
    alt_text: str = Field(min_length=1, max_length=200)
    sort_order: int = Field(ge=0)
    is_cover: bool = False


class InventoryResponse(BaseModel):
    categories: list[CategoryAdmin]
    rooms: list[RoomAdmin]
    facilities: list[FacilityAdmin]
    images: list[ImageAdmin]
