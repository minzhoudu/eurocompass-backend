-- Run once in Supabase's SQL editor (the backend has no migration tooling, see
-- 001_create_reservations_table.sql).
--
-- Days (or single departures) on which no reservations can be made.
-- starts_on / ends_on are inclusive calendar days. city NULL = every city;
-- time NULL = every departure that day. reason is optional and is shown to
-- passengers.
create table blocked_dates (
  id serial primary key,
  starts_on date not null,
  ends_on date not null,
  city text,
  time text
    check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  reason text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index idx_blocked_dates_ends_on on blocked_dates (ends_on);
