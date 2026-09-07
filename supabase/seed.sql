begin;

insert into public.room_categories (
  id, name, slug, description, base_price, max_guests, bed_type, room_size_sq_m
) values
  ('10000000-0000-0000-0000-000000000001', 'Deluxe King', 'deluxe-king',
   'A spacious king room for couples or solo travellers.', 5200.00, 2, 'King', 32.00),
  ('10000000-0000-0000-0000-000000000002', 'Family Suite', 'family-suite',
   'A two-zone suite designed for families.', 7800.00, 4, 'King and twin', 48.00),
  ('10000000-0000-0000-0000-000000000003', 'Garden Twin', 'garden-twin',
   'A quiet twin room overlooking the garden.', 4400.00, 2, 'Twin', 28.00)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  base_price = excluded.base_price,
  max_guests = excluded.max_guests,
  bed_type = excluded.bed_type,
  room_size_sq_m = excluded.room_size_sq_m,
  is_active = true;

insert into public.facilities (id, name, icon, description) values
  ('20000000-0000-0000-0000-000000000001', 'Wi-Fi', 'wifi', 'Complimentary high-speed internet.'),
  ('20000000-0000-0000-0000-000000000002', 'Air conditioning', 'snowflake', 'Individual climate control.'),
  ('20000000-0000-0000-0000-000000000003', 'Breakfast', 'coffee', 'Breakfast service is included.'),
  ('20000000-0000-0000-0000-000000000004', 'Television', 'tv', 'Smart television with streaming support.')
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  is_active = true;

insert into public.rooms (id, room_number, category_id, floor, description) values
  ('30000000-0000-0000-0000-000000000101', '101', '10000000-0000-0000-0000-000000000001', 1, 'Deluxe king room near the lobby.'),
  ('30000000-0000-0000-0000-000000000102', '102', '10000000-0000-0000-0000-000000000003', 1, 'Twin room with garden access.'),
  ('30000000-0000-0000-0000-000000000201', '201', '10000000-0000-0000-0000-000000000002', 2, 'Family suite with a separate sitting area.'),
  ('30000000-0000-0000-0000-000000000202', '202', '10000000-0000-0000-0000-000000000001', 2, 'Upper-floor deluxe king room.')
on conflict (id) do update set
  room_number = excluded.room_number,
  category_id = excluded.category_id,
  floor = excluded.floor,
  description = excluded.description,
  status = 'active';

insert into public.room_category_facilities (category_id, facility_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002')
on conflict do nothing;

commit;

