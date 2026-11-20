-- Studio desk users, per-area permissions, invites and an activity log.
-- Run once in the Supabase SQL editor after schema.sql. Safe to run again.
-- Existing rows in `admins` become owners; people you add later start as members.

create extension if not exists pgcrypto with schema extensions;

alter table admins add column if not exists role text not null default 'owner';
alter table admins alter column role set default 'member';
alter table admins add column if not exists title text not null default '';
alter table admins add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table admins add column if not exists active boolean not null default true;
alter table admins add column if not exists session_version int not null default 1;
alter table admins add column if not exists invite_hash text;
alter table admins add column if not exists invite_expires timestamptz;
alter table admins add column if not exists last_login_at timestamptz;
alter table admins alter column password_hash drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_role_check') then
    alter table admins add constraint admins_role_check check (role in ('owner', 'member'));
  end if;
end $$;

create unique index if not exists admins_invite_hash_key on admins (invite_hash) where invite_hash is not null;

-- Returns the user id when the email and password match an active account.
create or replace function staff_login(p_email text, p_password text)
returns uuid
language sql
security definer
set search_path = public, extensions
as $$
  select id
  from admins
  where lower(email) = lower(p_email)
    and active
    and password_hash is not null
    and password_hash = crypt(p_password, password_hash)
  limit 1;
$$;

-- Sets a new password, clears any open invite and signs the user out everywhere else.
create or replace function staff_set_password(p_id uuid, p_password text)
returns int
language sql
security definer
set search_path = public, extensions
as $$
  update admins
  set password_hash = crypt(p_password, gen_salt('bf', 10)),
      invite_hash = null,
      invite_expires = null,
      session_version = session_version + 1
  where id = p_id
  returning session_version;
$$;

-- True when the password matches this user's current password.
create or replace function staff_check_password(p_id uuid, p_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from admins
    where id = p_id and password_hash is not null and password_hash = crypt(p_password, password_hash)
  );
$$;

revoke all on function staff_login(text, text) from public, anon, authenticated;
revoke all on function staff_set_password(uuid, text) from public, anon, authenticated;
revoke all on function staff_check_password(uuid, text) from public, anon, authenticated;
grant execute on function staff_login(text, text) to service_role;
grant execute on function staff_set_password(uuid, text) to service_role;
grant execute on function staff_check_password(uuid, text) to service_role;

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references admins(id) on delete set null,
  actor_name text not null default '',
  area text not null default '',
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on activity_log (created_at desc);
create index if not exists activity_log_actor_idx on activity_log (actor_id, created_at desc);

-- Failed and successful sign-ins, used to lock out password guessing. IPs are stored as salted hashes.
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null default '',
  ip_hash text not null default '',
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_email_idx on login_attempts (email, created_at desc);
create index if not exists login_attempts_ip_idx on login_attempts (ip_hash, created_at desc);

-- No policies: only the server (service role) reads or writes users, activity and sign-in attempts.
alter table admins enable row level security;
alter table activity_log enable row level security;
alter table login_attempts enable row level security;
