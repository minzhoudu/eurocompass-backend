-- Run once in Supabase's SQL editor. The backend has no migration tooling
-- (see database.module.ts, synchronize is off), so this is applied manually.
create table reservations (
  id serial primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  starting_location text not null,
  travel_date date not null,
  travel_time text not null,
  number_of_tickets integer not null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_reservations_created_at on reservations (created_at);
