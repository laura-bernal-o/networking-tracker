-- Secure Networking Tracker — database schema
--
-- Run this once against your Neon project's SQL editor (or via
-- `psql "$DATABASE_URL" -f db/schema.sql`) after creating the project and
-- enabling Managed Better Auth. It is NOT executed by the running app.
--
-- auth.user_id() is provided by Neon's pg_session_jwt extension, populated
-- from the JWT that the Data API validates on every request.

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default auth.user_id(),
  name text not null check (btrim(name) <> ''),
  company text not null default '',
  role text not null default '',
  met_at text not null default '',
  notes text not null default '',
  priority text not null check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on contacts (user_id);

-- The Data API's Postgres roles (authenticator/anonymous/authenticated) get
-- no table privileges by default — RLS only filters rows an already-granted
-- role can see, it doesn't grant access on its own. Without this, every
-- Data API request gets a blanket 403 regardless of the policies below.
grant select, insert, update, delete on contacts to authenticated;

-- Row Level Security: every policy is scoped to the signed-in user.
alter table contacts enable row level security;

drop policy if exists "select_own_contacts" on contacts;
create policy "select_own_contacts" on contacts
  for select
  to authenticated
  using (auth.user_id() = user_id);

drop policy if exists "insert_own_contacts" on contacts;
create policy "insert_own_contacts" on contacts
  for insert
  to authenticated
  with check (auth.user_id() = user_id);

drop policy if exists "update_own_contacts" on contacts;
create policy "update_own_contacts" on contacts
  for update
  to authenticated
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

drop policy if exists "delete_own_contacts" on contacts;
create policy "delete_own_contacts" on contacts
  for delete
  to authenticated
  using (auth.user_id() = user_id);

-- Keep updated_at current on every write.
create or replace function set_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_set_updated_at on contacts;
create trigger contacts_set_updated_at
  before update on contacts
  for each row
  execute function set_contacts_updated_at();
