-- Run once in Supabase's SQL editor (the backend has no migration tooling, see
-- 001_create_reservations_table.sql).
--
-- Who did what in the admin panel. Rows are only ever inserted by the backend
-- (and pruned after a year). actor_email / actor_name are copied in, not linked
-- to the user table, so the history survives a user being removed. actor_email
-- is NULL for automatic jobs (the nightly cleanup). entity_id is text so any
-- kind of id fits. details holds what changed (field -> [from, to]) or a
-- snapshot of what was deleted.
create table audit_log (
  id serial primary key,
  created_at timestamptz not null default now(),
  actor_email text,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  details jsonb,
  ip_address text
);

create index idx_audit_log_created_at on audit_log (created_at desc, id desc);
create index idx_audit_log_entity_type on audit_log (entity_type);
create index idx_audit_log_actor_email on audit_log (actor_email);
