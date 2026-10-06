-- Run once in Supabase's SQL editor (the backend has no migration tooling, see
-- 001_create_reservations_table.sql).
--
-- Site-wide notices shown as a banner on the public site. starts_on / ends_on
-- are inclusive calendar days in Europe/Belgrade; NULL means "no limit", so a
-- notice with both NULL shows until it is disabled or deleted.
create table notices (
  id serial primary key,
  message text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'danger')),
  starts_on date,
  ends_on date,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
