begin;

select plan(18);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'room_categories', 'room_categories table exists');
select has_table('public', 'rooms', 'rooms table exists');
select has_table('public', 'facilities', 'facilities table exists');
select has_table('public', 'room_category_facilities', 'category facilities table exists');
select has_table('public', 'room_images', 'room_images table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'booking_status_history', 'booking history table exists');
select has_table('public', 'enquiries', 'enquiries table exists');

select policies_are('public', 'profiles', array[
  'profiles_select_own_or_admin', 'profiles_update_own'
], 'profiles policies are explicit');
select policies_are('public', 'bookings', array[
  'bookings_admin_select', 'bookings_admin_update', 'bookings_select_own'
], 'booking policies are explicit');
select policies_are('public', 'enquiries', array[
  'enquiries_admin_select', 'enquiries_admin_update', 'enquiries_insert_public', 'enquiries_select_own'
], 'enquiry policies are explicit');

select col_is_pk('public', 'profiles', 'id', 'profiles has a primary key');
select col_is_fk('public', 'profiles', 'id', 'profile identity references auth.users');
select col_is_fk('public', 'bookings', 'user_id', 'booking references its customer');
select col_is_fk('public', 'bookings', 'room_id', 'booking references its room');
select has_index('public', 'bookings', 'bookings_user_id_created_at_idx', 'customer booking lookup is indexed');
select has_function('public', 'is_admin', array[]::text[], 'admin helper function exists');

select * from finish();
rollback;
