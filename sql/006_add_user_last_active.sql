-- Run once in Supabase's SQL editor (the backend has no migration tooling, see
-- 001_create_reservations_table.sql).
--
-- When an admin last actually used the admin panel (clicked, typed, scrolled:
-- reported by the panel itself, not by its background refreshing), shown on
-- the Administratori page. NULL until the account is used for the first time
-- after this is deployed.
alter table "user" add column last_active_at timestamptz;
