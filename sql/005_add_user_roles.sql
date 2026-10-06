-- Run once in Supabase's SQL editor (the backend has no migration tooling, see
-- 001_create_reservations_table.sql).
--
-- Admin roles: 'owner' can manage admin accounts and see the audit log;
-- 'admin' can do everything else. is_active = false blocks login without
-- deleting the account. tokens_valid_after: login tokens issued before this
-- moment stop working (set when an owner resets someone's password).
alter table "user"
  add column role text not null default 'admin'
    check (role in ('owner', 'admin')),
  add column is_active boolean not null default true,
  add column tokens_valid_after timestamptz;

-- Somebody has to be the first owner, or nobody could open the admin-management
-- page. This makes the OLDEST account the owner. CHECK THE RESULT, and if that
-- is the wrong person, run for example:
--   update "user" set role = 'owner' where email_address = 'you@example.com';
--   update "user" set role = 'admin' where email_address = 'someone@example.com';
update "user" set role = 'owner' where id = (select min(id) from "user");

select id, first_name, last_name, email_address, role from "user" order by id;
