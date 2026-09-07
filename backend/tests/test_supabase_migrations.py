from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "supabase" / "migrations"
SEED = ROOT / "supabase" / "seed.sql"


def migration_sql() -> str:
    files = sorted(MIGRATIONS.glob("*.sql"))
    assert files, "At least one Supabase migration is required"
    return "\n".join(path.read_text(encoding="utf-8") for path in files).lower()


def test_every_application_table_enables_rls() -> None:
    sql = migration_sql()
    tables = {
        "profiles",
        "room_categories",
        "rooms",
        "facilities",
        "room_category_facilities",
        "room_images",
        "bookings",
        "booking_status_history",
        "enquiries",
    }

    for table in tables:
        assert f"alter table public.{table} enable row level security" in sql
        assert f"revoke all on table public.{table} from anon, authenticated" in sql


def test_booking_overlap_constraint_uses_half_open_range() -> None:
    sql = migration_sql()

    assert "bookings_no_overlapping_active_dates" in sql
    assert "daterange(check_in, check_out, '[)') with &&" in sql
    assert "status in ('pending', 'confirmed', 'checked_in')" in sql


def test_security_definer_functions_pin_search_path() -> None:
    sql = migration_sql()

    for function in ("handle_new_user", "is_admin"):
        start = sql.index(f"create function public.{function}")
        body = sql[start : start + 800]
        assert "security definer" in body
        assert "set search_path = ''" in body


def test_customer_role_is_not_update_granted() -> None:
    sql = migration_sql()

    assert "grant update (full_name, phone, avatar_path) on public.profiles" in sql
    assert "grant update on public.profiles" not in sql


def test_booking_writes_are_backend_only() -> None:
    sql = migration_sql()

    assert "grant insert on public.bookings" not in sql
    assert "bookings_insert_own" not in sql


def test_public_enquiry_insert_cannot_set_workflow_fields() -> None:
    sql = migration_sql()

    assert "grant insert (user_id, name, email, phone, subject, message)" in sql
    assert "grant insert on public.enquiries" not in sql


def test_seed_contains_only_catalog_data_and_is_repeatable() -> None:
    seed = SEED.read_text(encoding="utf-8").lower()

    assert "auth.users" not in seed
    assert "on conflict" in seed
    assert "insert into public.room_categories" in seed
    assert "insert into public.rooms" in seed
    assert "insert into public.facilities" in seed
