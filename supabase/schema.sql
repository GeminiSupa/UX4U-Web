create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text not null default '',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  summary text not null default '',
  features text not null default '',
  services text not null default '',
  image_url text not null default '',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text not null default '',
  points text not null default '',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  body text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null default '',
  service text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default '',
  website text not null default '',
  emails text not null default '',
  phones text not null default '',
  whatsapp text not null default '',
  contact_name text not null default '',
  city text not null default '',
  category text not null default '',
  source_url text not null default '',
  notes text not null default '',
  current_pos text not null default '',
  contacted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id int primary key default 1,
  seeded boolean not null default false
);

insert into site_settings (id, seeded) values (1, false) on conflict (id) do nothing;

create extension if not exists pgcrypto with schema extensions;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now()
);

create or replace function admin_login(p_email text, p_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from admins
    where lower(email) = lower(p_email)
      and password_hash = crypt(p_password, password_hash)
  );
$$;

revoke all on function admin_login(text, text) from public;
revoke all on function admin_login(text, text) from anon, authenticated;
grant execute on function admin_login(text, text) to service_role;

alter table team_members enable row level security;
alter table projects enable row level security;
alter table offers enable row level security;
alter table posts enable row level security;
alter table inquiries enable row level security;
alter table leads enable row level security;
alter table site_settings enable row level security;
alter table admins enable row level security;

drop policy if exists "public read team" on team_members;
create policy "public read team" on team_members for select to anon, authenticated using (published);

drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select to anon, authenticated using (published);

drop policy if exists "public read offers" on offers;
create policy "public read offers" on offers for select to anon, authenticated using (published);

drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select to anon, authenticated using (published);

drop policy if exists "public insert inquiries" on inquiries;
create policy "public insert inquiries" on inquiries for insert to anon, authenticated
  with check (char_length(name) between 2 and 120 and char_length(message) between 2 and 4000 and position('@' in email) > 1);
