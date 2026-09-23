from datetime import date
from decimal import Decimal
from math import ceil
from urllib.parse import quote
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.money import from_paise, to_paise
from app.schemas.catalog import (
    FacilityResponse,
    RoomCategoryListResponse,
    RoomCategoryResponse,
    RoomImageResponse,
)

CATEGORY_SELECT = """
select c.id, c.name, c.slug, c.description, c.base_price, c.max_guests,
       c.bed_type, c.room_size_sq_m,
       count(distinct r.id) as available_room_count
from room_categories c
left join rooms r on r.category_id = c.id and r.status = 'active'
  and (
    not :has_dates or not exists (
      select 1 from bookings b
      where b.room_id = r.id
        and b.status in ('pending', 'confirmed', 'checked_in')
        and not (b.check_out <= :check_in or b.check_in >= :check_out)
    )
  )
where c.is_active and (:query = '' or lower(c.name) like lower(:pattern)
  or lower(c.description) like lower(:pattern))
  and (:guests is null or c.max_guests >= :guests)
  and (:min_price is null or c.base_price >= :min_price)
  and (:max_price is null or c.base_price <= :max_price)
  and (:category = '' or c.slug = :category)
group by c.id
having (not :has_dates or count(distinct r.id) > 0)
"""


def _storage_url(path: str) -> str:
    base_url = str(get_settings().api_url).rstrip("/")
    return f"{base_url}/media/{quote(path, safe='/')}"


async def _relations(
    session: AsyncSession,
    category_ids: list[UUID],
) -> tuple[dict[str, list[FacilityResponse]], dict[str, list[RoomImageResponse]]]:
    keys = [str(item) for item in category_ids]
    facilities: dict[str, list[FacilityResponse]] = {item: [] for item in keys}
    images: dict[str, list[RoomImageResponse]] = {item: [] for item in keys}
    if not category_ids:
        return facilities, images

    facility_query = text("""
        select rcf.category_id, f.id, f.name, f.icon, f.description
        from room_category_facilities rcf
        join facilities f on f.id = rcf.facility_id and f.is_active
        where rcf.category_id in :category_ids order by f.name
    """).bindparams(bindparam("category_ids", expanding=True))
    facility_rows = (await session.execute(facility_query, {"category_ids": keys})).mappings()
    for row in facility_rows:
        facilities[row["category_id"]].append(FacilityResponse.model_validate(row))

    image_query = text("""
        select id, category_id, storage_path, alt_text, sort_order, is_cover
        from room_images where category_id in :category_ids
        order by is_cover desc, sort_order, created_at
    """).bindparams(bindparam("category_ids", expanding=True))
    image_rows = (await session.execute(image_query, {"category_ids": keys})).mappings()
    for row in image_rows:
        images[row["category_id"]].append(RoomImageResponse(
            id=row["id"], url=_storage_url(row["storage_path"]), alt_text=row["alt_text"],
            sort_order=row["sort_order"], is_cover=row["is_cover"],
        ))
    return facilities, images


async def list_categories(
    session: AsyncSession,
    page: int,
    page_size: int,
    query: str,
    *,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    category: str = "",
) -> RoomCategoryListResponse:
    normalized = query.strip()
    parameters = {
        "query": normalized,
        "pattern": f"%{normalized}%",
        "has_dates": check_in is not None and check_out is not None,
        "check_in": check_in,
        "check_out": check_out,
        "guests": guests,
        "min_price": to_paise(min_price) if min_price is not None else None,
        "max_price": to_paise(max_price) if max_price is not None else None,
        "category": category,
    }
    total_result = await session.execute(
        text(f"select count(*) from ({CATEGORY_SELECT}) categories"), parameters
    )
    total = total_result.scalar_one()
    list_query = f"{CATEGORY_SELECT} order by c.base_price, c.name limit :limit offset :offset"
    result = await session.execute(
        text(list_query),
        {**parameters, "limit": page_size, "offset": (page - 1) * page_size},
    )
    rows = [dict(row) for row in result.mappings().all()]
    for row in rows:
        row["base_price"] = from_paise(row["base_price"])
    ids = [row["id"] for row in rows]
    facilities, images = await _relations(session, ids)
    items = [
        RoomCategoryResponse(
            **row,
            facilities=facilities[str(row["id"])],
            images=images[str(row["id"])],
        )
        for row in rows
    ]
    return RoomCategoryListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=ceil(total / page_size) if total else 0,
    )


async def get_category(session: AsyncSession, slug: str) -> RoomCategoryResponse | None:
    query = CATEGORY_SELECT.replace("group by c.id", "and c.slug = :slug\ngroup by c.id")
    row = (
        await session.execute(
            text(query),
            {
                "query": "",
                "pattern": "%%",
                "slug": slug,
                "has_dates": False,
                "check_in": None,
                "check_out": None,
                "guests": None,
                "min_price": None,
                "max_price": None,
                "category": "",
            },
        )
    ).mappings().one_or_none()
    if row is None:
        return None
    values = dict(row)
    values["base_price"] = from_paise(values["base_price"])
    facilities, images = await _relations(session, [UUID(str(row["id"]))])
    key = str(row["id"])
    return RoomCategoryResponse(**values, facilities=facilities[key], images=images[key])
