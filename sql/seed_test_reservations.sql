-- Dev/local-only seed script: inserts ~100 test reservations so pagination,
-- search, and the duplicate-trip badge can be exercised against real data.
-- NOT a migration - run manually against your DEV database, never prod.

begin;

insert into reservations
  (full_name, email, phone, starting_location, travel_date, travel_time, number_of_tickets, note, created_at)
select
  'Test Putnik ' || i,
  'test.putnik' || i || '@example.com',
  '06' || lpad((10000000 + i)::text, 8, '0'),
  case when i % 2 = 0 then 'Kruševac' else 'Beograd' end,
  (current_date + ((i % 21) || ' days')::interval)::date,
  case when i % 3 = 0 then '06:00' when i % 3 = 1 then '12:00' else '16:00' end,
  1 + (i % 4),
  case when i % 10 = 0 then 'Test napomena br. ' || i else null end,
  -- Spreads created_at from "today" (i=1) back ~99 days (i=100), so the
  -- today/week/month/year stat buckets all end up with a plausible count.
  now() - ((i - 1) || ' days')::interval - (i || ' seconds')::interval
from generate_series(1, 100) as i;

-- Deliberate same-trip duplicate (same email + travel date/time + starting
-- location, case/whitespace varied to prove normalization) - lands a few
-- pages apart so it exercises the pagination-spanning duplicate check.
insert into reservations
  (full_name, email, phone, starting_location, travel_date, travel_time, number_of_tickets, note, created_at)
values
  ('Dupli Test A', 'dupli.test@example.com', '0611111111', 'Kruševac', current_date + 5, '08:00', 2, null, now() - interval '1 hour'),
  ('Dupli Test B', ' DUPLI.TEST@example.com ', '0611111112', ' kruševac ', current_date + 5, '08:00', 1, null, now() - interval '15 days');

-- A distinctly-named row for testing the search box.
insert into reservations
  (full_name, email, phone, starting_location, travel_date, travel_time, number_of_tickets, note, created_at)
values
  ('Search Target Runjic', 'runjic.search@example.com', '0629998877', 'Beograd', current_date + 2, '16:00', 3, null, now() - interval '30 minutes');

commit;
