import secrets
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.core.passwords import hash_password
from app.db.session import get_engine

SCHEMA_VERSION = 2
UUID_DEFAULT = """(
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
  substr(hex(randomblob(2)), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
  hex(randomblob(6)))
)"""

SCHEMA_STATEMENTS = [
    """create table if not exists profiles (
      id text primary key,
      email text,
      password_hash text,
      full_name text not null default '' check(length(full_name) <= 120),
      phone text check(phone is null or length(phone) <= 30),
      avatar_path text,
      role text not null default 'customer' check(role in ('customer', 'admin')),
      is_active integer not null default 1 check(is_active in (0, 1)),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    )""",
    """create unique index if not exists profiles_email_unique_idx
      on profiles(lower(email)) where email is not null""",
    f"""create table if not exists room_categories (
      id text primary key default {UUID_DEFAULT},
      name text not null check(length(name) between 1 and 100),
      slug text not null unique check(length(slug) >= 1),
      description text not null default '',
      base_price integer not null check(base_price >= 0),
      max_guests integer not null check(max_guests > 0),
      bed_type text not null,
      room_size_sq_m numeric check(room_size_sq_m is null or room_size_sq_m > 0),
      is_active integer not null default 1 check(is_active in (0, 1)),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    )""",
    f"""create table if not exists rooms (
      id text primary key default {UUID_DEFAULT},
      room_number text not null unique check(length(room_number) between 1 and 30),
      category_id text not null references room_categories(id) on delete restrict,
      floor integer,
      description text not null default '',
      status text not null default 'active'
        check(status in ('active', 'maintenance', 'inactive')),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    )""",
    f"""create table if not exists facilities (
      id text primary key default {UUID_DEFAULT},
      name text not null unique check(length(name) between 1 and 100),
      icon text,
      description text not null default '',
      is_active integer not null default 1 check(is_active in (0, 1)),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    )""",
    """create table if not exists room_category_facilities (
      category_id text not null references room_categories(id) on delete cascade,
      facility_id text not null references facilities(id) on delete cascade,
      created_at text not null default current_timestamp,
      primary key (category_id, facility_id)
    )""",
    f"""create table if not exists room_images (
      id text primary key default {UUID_DEFAULT},
      room_id text references rooms(id) on delete cascade,
      category_id text references room_categories(id) on delete cascade,
      storage_path text not null unique check(length(storage_path) between 1 and 500),
      alt_text text not null check(length(alt_text) between 1 and 200),
      sort_order integer not null default 0 check(sort_order >= 0),
      is_cover integer not null default 0 check(is_cover in (0, 1)),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp,
      check((room_id is not null) <> (category_id is not null))
    )""",
    f"""create table if not exists bookings (
      id text primary key default {UUID_DEFAULT},
      booking_reference text not null unique,
      user_id text not null references profiles(id) on delete restrict,
      room_id text not null references rooms(id) on delete restrict,
      check_in text not null,
      check_out text not null check(check_out > check_in),
      adult_count integer not null default 1,
      child_count integer not null default 0,
      guest_name text not null check(length(guest_name) between 1 and 120),
      guest_email text not null check(length(guest_email) between 3 and 320),
      guest_phone text not null check(length(guest_phone) between 3 and 30),
      price_per_night integer not null check(price_per_night >= 0),
      night_count integer not null check(night_count > 0),
      subtotal integer not null check(subtotal >= 0),
      tax_amount integer not null default 0 check(tax_amount >= 0),
      total_amount integer not null check(total_amount = subtotal + tax_amount),
      status text not null default 'pending' check(status in
        ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'rejected')),
      special_requests text,
      cancelled_at text,
      cancellation_reason text,
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp,
      check(adult_count >= 0 and child_count >= 0 and adult_count + child_count > 0),
      check(night_count = cast(julianday(check_out) - julianday(check_in) as integer))
    )""",
    f"""create table if not exists booking_status_history (
      id text primary key default {UUID_DEFAULT},
      booking_id text not null references bookings(id) on delete cascade,
      from_status text,
      to_status text not null check(to_status in
        ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'rejected')),
      changed_by text references profiles(id) on delete set null,
      reason text,
      created_at text not null default current_timestamp,
      check(from_status is null or from_status <> to_status)
    )""",
    f"""create table if not exists enquiries (
      id text primary key default {UUID_DEFAULT},
      user_id text references profiles(id) on delete set null,
      name text not null check(length(name) between 1 and 120),
      email text not null check(length(email) between 3 and 320),
      phone text,
      subject text not null check(length(subject) between 1 and 200),
      message text not null check(length(message) between 1 and 5000),
      status text not null default 'new'
        check(status in ('new', 'in_progress', 'resolved', 'closed')),
      assigned_to text references profiles(id) on delete set null,
      admin_notes text,
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    )""",
    """create unique index if not exists room_images_one_room_cover_idx
      on room_images(room_id) where room_id is not null and is_cover = 1""",
    """create unique index if not exists room_images_one_category_cover_idx
      on room_images(category_id) where category_id is not null and is_cover = 1""",
    "create index if not exists rooms_category_id_idx on rooms(category_id)",
    "create index if not exists rooms_status_idx on rooms(status)",
    """create index if not exists bookings_user_id_created_at_idx
      on bookings(user_id, created_at desc)""",
    """create index if not exists bookings_room_id_dates_idx
      on bookings(room_id, check_in, check_out)""",
    """create index if not exists bookings_status_created_at_idx
      on bookings(status, created_at desc)""",
    """create index if not exists enquiries_status_created_at_idx
      on enquiries(status, created_at desc)""",
    """create trigger if not exists bookings_prevent_overlap_insert
      before insert on bookings
      when new.status in ('pending', 'confirmed', 'checked_in') and exists (
        select 1 from bookings b where b.room_id = new.room_id
          and b.status in ('pending', 'confirmed', 'checked_in')
          and not (b.check_out <= new.check_in or b.check_in >= new.check_out)
      ) begin select raise(abort, 'booking_overlap'); end""",
    """create trigger if not exists bookings_prevent_overlap_update
      before update of room_id, check_in, check_out, status on bookings
      when new.status in ('pending', 'confirmed', 'checked_in') and exists (
        select 1 from bookings b where b.room_id = new.room_id and b.id <> new.id
          and b.status in ('pending', 'confirmed', 'checked_in')
          and not (b.check_out <= new.check_in or b.check_in >= new.check_out)
      ) begin select raise(abort, 'booking_overlap'); end""",
]

SEED_STATEMENTS = [
    """insert into room_categories
      (id, name, slug, description, base_price, max_guests, bed_type, room_size_sq_m)
      values
      ('10000000-0000-0000-0000-000000000001', 'Deluxe King', 'deluxe-king',
       'A spacious king room for couples or solo travellers.', 520000, 2, 'King', 32),
      ('10000000-0000-0000-0000-000000000002', 'Family Suite', 'family-suite',
       'A two-zone suite designed for families.', 780000, 4, 'King and twin', 48),
      ('10000000-0000-0000-0000-000000000003', 'Garden Twin', 'garden-twin',
       'A quiet twin room overlooking the garden.', 440000, 2, 'Twin', 28)
      on conflict(id) do update set name=excluded.name, slug=excluded.slug,
       description=excluded.description, base_price=excluded.base_price,
       max_guests=excluded.max_guests, bed_type=excluded.bed_type,
       room_size_sq_m=excluded.room_size_sq_m, is_active=1""",
    """insert into facilities (id, name, icon, description) values
      ('20000000-0000-0000-0000-000000000001', 'Wi-Fi', 'wifi',
       'Complimentary high-speed internet.'),
      ('20000000-0000-0000-0000-000000000002', 'Air conditioning', 'snowflake',
       'Individual climate control.'),
      ('20000000-0000-0000-0000-000000000003', 'Breakfast', 'coffee',
       'Breakfast service is included.'),
      ('20000000-0000-0000-0000-000000000004', 'Television', 'tv',
       'Smart television with streaming support.')
      on conflict(id) do update set name=excluded.name, icon=excluded.icon,
       description=excluded.description, is_active=1""",
    """insert into rooms (id, room_number, category_id, floor, description) values
      ('30000000-0000-0000-0000-000000000101', '101',
       '10000000-0000-0000-0000-000000000001', 1, 'Deluxe king room near the lobby.'),
      ('30000000-0000-0000-0000-000000000102', '102',
       '10000000-0000-0000-0000-000000000003', 1, 'Twin room with garden access.'),
      ('30000000-0000-0000-0000-000000000201', '201',
       '10000000-0000-0000-0000-000000000002', 2,
       'Family suite with a separate sitting area.'),
      ('30000000-0000-0000-0000-000000000202', '202',
       '10000000-0000-0000-0000-000000000001', 2,
       'Upper-floor deluxe king room.')
      on conflict(id) do update set room_number=excluded.room_number,
       category_id=excluded.category_id, floor=excluded.floor,
       description=excluded.description, status='active'""",
    """insert into room_category_facilities (category_id, facility_id) values
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
      ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004'),
      ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
      ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
      ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
      ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'),
      ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
      ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002')
      on conflict do nothing""",
]


@dataclass(frozen=True)
class InitialAdminCredential:
    email: str
    password: str


async def initialize_database(
    engine: AsyncEngine | None = None,
    *,
    admin_password: str | None = None,
    announce_admin: bool = False,
) -> InitialAdminCredential | None:
    target = engine or get_engine()
    settings = get_settings()
    if engine is None:
        settings.database_path.parent.mkdir(parents=True, exist_ok=True)
        settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    async with target.begin() as connection:
        current = (await connection.exec_driver_sql("PRAGMA user_version")).scalar_one()
        if current not in range(SCHEMA_VERSION + 1):
            raise RuntimeError(
                f"Unsupported local database schema {current}; expected at most {SCHEMA_VERSION}"
            )
        if current == 1:
            await connection.exec_driver_sql("alter table profiles add column email text")
            await connection.exec_driver_sql("alter table profiles add column password_hash text")
        for statement in SCHEMA_STATEMENTS:
            await connection.exec_driver_sql(statement)
        for statement in SEED_STATEMENTS:
            await connection.exec_driver_sql(statement)
        existing_admin = (
            await connection.exec_driver_sql(
                "select id from profiles where lower(email) = 'admin@example.com'"
            )
        ).scalar_one_or_none()
        credential = None
        if existing_admin is None:
            password = admin_password or secrets.token_urlsafe(18)
            await connection.exec_driver_sql(
                """insert into profiles
                (id, email, password_hash, full_name, role)
                values (?, 'admin@example.com', ?, 'Local Administrator', 'admin')""",
                (str(uuid4()), hash_password(password)),
            )
            credential = InitialAdminCredential("admin@example.com", password)
        await connection.exec_driver_sql(f"PRAGMA user_version={SCHEMA_VERSION}")
    if credential is not None and announce_admin:
        print("\nLocal administrator created")
        print(f"Email: {credential.email}")
        print(f"One-time initial password: {credential.password}\n")
    return credential


def local_database_exists(path: Path | None = None) -> bool:
    return (path or get_settings().database_path).is_file()
