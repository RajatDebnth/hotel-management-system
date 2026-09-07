begin;

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('customer', 'admin');
create type public.room_status as enum ('active', 'maintenance', 'inactive');
create type public.booking_status as enum (
  'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'rejected'
);
create type public.enquiry_status as enum ('new', 'in_progress', 'resolved', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_path text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 120),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 30)
);

create table public.room_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  base_price numeric(12, 2) not null,
  max_guests smallint not null,
  bed_type text not null,
  room_size_sq_m numeric(7, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_categories_name_length check (char_length(name) between 1 and 100),
  constraint room_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint room_categories_base_price_positive check (base_price >= 0),
  constraint room_categories_max_guests_positive check (max_guests > 0),
  constraint room_categories_room_size_positive check (room_size_sq_m is null or room_size_sq_m > 0)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique,
  category_id uuid not null references public.room_categories(id) on delete restrict,
  floor smallint,
  description text not null default '',
  status public.room_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_number_length check (char_length(room_number) between 1 and 30)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facilities_name_length check (char_length(name) between 1 and 100)
);

create table public.room_category_facilities (
  category_id uuid not null references public.room_categories(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, facility_id)
);

create table public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  category_id uuid references public.room_categories(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_images_single_parent check (num_nonnulls(room_id, category_id) = 1),
  constraint room_images_path_length check (char_length(storage_path) between 1 and 500),
  constraint room_images_alt_text_length check (char_length(alt_text) between 1 and 200),
  constraint room_images_sort_order_nonnegative check (sort_order >= 0)
);

create unique index room_images_one_room_cover_idx
  on public.room_images(room_id) where room_id is not null and is_cover;
create unique index room_images_one_category_cover_idx
  on public.room_images(category_id) where category_id is not null and is_cover;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  adult_count smallint not null default 1,
  child_count smallint not null default 0,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  price_per_night numeric(12, 2) not null,
  night_count integer not null,
  subtotal numeric(12, 2) not null,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  status public.booking_status not null default 'pending',
  special_requests text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_reference_format check (booking_reference ~ '^HMS-[A-Z0-9]{8,20}$'),
  constraint bookings_date_order check (check_out > check_in),
  constraint bookings_guest_counts check (adult_count >= 0 and child_count >= 0 and adult_count + child_count > 0),
  constraint bookings_night_count check (night_count = check_out - check_in and night_count > 0),
  constraint bookings_amounts_nonnegative check (
    price_per_night >= 0 and subtotal >= 0 and tax_amount >= 0 and total_amount >= 0
  ),
  constraint bookings_total_consistent check (total_amount = subtotal + tax_amount),
  constraint bookings_guest_name_length check (char_length(guest_name) between 1 and 120),
  constraint bookings_guest_email_length check (char_length(guest_email) between 3 and 320),
  constraint bookings_guest_phone_length check (char_length(guest_phone) between 3 and 30)
);

alter table public.bookings
  add constraint bookings_no_overlapping_active_dates
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'checked_in'));

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  constraint booking_status_history_transition check (from_status is null or from_status <> to_status)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status public.enquiry_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_name_length check (char_length(name) between 1 and 120),
  constraint enquiries_email_length check (char_length(email) between 3 and 320),
  constraint enquiries_subject_length check (char_length(subject) between 1 and 200),
  constraint enquiries_message_length check (char_length(message) between 1 and 5000)
);

create index rooms_category_id_idx on public.rooms(category_id);
create index rooms_status_idx on public.rooms(status);
create index room_category_facilities_facility_id_idx on public.room_category_facilities(facility_id);
create index room_images_room_id_idx on public.room_images(room_id);
create index room_images_category_id_idx on public.room_images(category_id);
create index bookings_user_id_created_at_idx on public.bookings(user_id, created_at desc);
create index bookings_room_id_dates_idx on public.bookings(room_id, check_in, check_out);
create index bookings_status_created_at_idx on public.bookings(status, created_at desc);
create index booking_status_history_booking_id_idx on public.booking_status_history(booking_id, created_at);
create index enquiries_user_id_idx on public.enquiries(user_id);
create index enquiries_status_created_at_idx on public.enquiries(status, created_at desc);
create index enquiries_assigned_to_idx on public.enquiries(assigned_to);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger room_categories_set_updated_at before update on public.room_categories
  for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();
create trigger facilities_set_updated_at before update on public.facilities
  for each row execute function public.set_updated_at();
create trigger room_images_set_updated_at before update on public.room_images
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger enquiries_set_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.room_categories enable row level security;
alter table public.rooms enable row level security;
alter table public.facilities enable row level security;
alter table public.room_category_facilities enable row level security;
alter table public.room_images enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.enquiries enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.room_categories from anon, authenticated;
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.facilities from anon, authenticated;
revoke all on table public.room_category_facilities from anon, authenticated;
revoke all on table public.room_images from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.booking_status_history from anon, authenticated;
revoke all on table public.enquiries from anon, authenticated;

grant select on public.room_categories, public.rooms, public.facilities,
  public.room_category_facilities, public.room_images to anon, authenticated;
grant select on public.profiles, public.bookings, public.booking_status_history,
  public.enquiries to authenticated;
grant insert (user_id, name, email, phone, subject, message)
  on public.enquiries to anon, authenticated;
grant update (full_name, phone, avatar_path) on public.profiles to authenticated;
grant insert, update, delete on public.room_categories, public.rooms, public.facilities,
  public.room_category_facilities, public.room_images to authenticated;
grant update on public.bookings, public.enquiries to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy categories_public_select_active on public.room_categories
  for select to anon, authenticated using (is_active);
create policy categories_admin_select_all on public.room_categories
  for select to authenticated using ((select public.is_admin()));
create policy categories_admin_insert on public.room_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.room_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.room_categories
  for delete to authenticated using ((select public.is_admin()));

create policy rooms_public_select_active on public.rooms
  for select to anon, authenticated
  using (status = 'active' and exists (
    select 1 from public.room_categories c where c.id = category_id and c.is_active
  ));
create policy rooms_admin_select_all on public.rooms
  for select to authenticated using ((select public.is_admin()));
create policy rooms_admin_insert on public.rooms
  for insert to authenticated with check ((select public.is_admin()));
create policy rooms_admin_update on public.rooms
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy rooms_admin_delete on public.rooms
  for delete to authenticated using ((select public.is_admin()));

create policy facilities_public_select_active on public.facilities
  for select to anon, authenticated using (is_active);
create policy facilities_admin_select_all on public.facilities
  for select to authenticated using ((select public.is_admin()));
create policy facilities_admin_insert on public.facilities
  for insert to authenticated with check ((select public.is_admin()));
create policy facilities_admin_update on public.facilities
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy facilities_admin_delete on public.facilities
  for delete to authenticated using ((select public.is_admin()));

create policy category_facilities_public_select on public.room_category_facilities
  for select to anon, authenticated using (true);
create policy category_facilities_admin_insert on public.room_category_facilities
  for insert to authenticated with check ((select public.is_admin()));
create policy category_facilities_admin_delete on public.room_category_facilities
  for delete to authenticated using ((select public.is_admin()));

create policy room_images_public_select on public.room_images
  for select to anon, authenticated using (true);
create policy room_images_admin_insert on public.room_images
  for insert to authenticated with check ((select public.is_admin()));
create policy room_images_admin_update on public.room_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy room_images_admin_delete on public.room_images
  for delete to authenticated using ((select public.is_admin()));

create policy bookings_select_own on public.bookings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy bookings_admin_select on public.bookings
  for select to authenticated using ((select public.is_admin()));
create policy bookings_admin_update on public.bookings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy booking_history_select_own on public.booking_status_history
  for select to authenticated using (exists (
    select 1 from public.bookings b where b.id = booking_id and b.user_id = (select auth.uid())
  ));
create policy booking_history_admin_select on public.booking_status_history
  for select to authenticated using ((select public.is_admin()));

create policy enquiries_insert_public on public.enquiries
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy enquiries_select_own on public.enquiries
  for select to authenticated using (user_id = (select auth.uid()));
create policy enquiries_admin_select on public.enquiries
  for select to authenticated using ((select public.is_admin()));
create policy enquiries_admin_update on public.enquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

comment on constraint bookings_no_overlapping_active_dates on public.bookings is
  'Prevents overlapping pending, confirmed, or checked-in reservations for the same room.';
comment on column public.bookings.price_per_night is
  'Immutable price snapshot captured when the booking is created.';

commit;
