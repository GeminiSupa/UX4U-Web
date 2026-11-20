-- Blog editor, visitor analytics, team tasks/time/chat/notifications and trend watch.
-- Run once in the Supabase SQL editor after schema.sql and users.sql. Safe to run again.

------------------------------------------------------------------ Journal posts
alter table posts add column if not exists blocks jsonb;
alter table posts add column if not exists cover_url text not null default '';
alter table posts add column if not exists seo_title text not null default '';
alter table posts add column if not exists seo_description text not null default '';
alter table posts add column if not exists focus_keyword text not null default '';
alter table posts add column if not exists author_name text not null default '';
alter table posts add column if not exists publish_at timestamptz;
alter table posts add column if not exists updated_at timestamptz not null default now();
-- Older posts were not edited in the new editor: keep their "updated" date equal to their creation date.
update posts set updated_at = created_at where blocks is null and updated_at > created_at;

-- Scheduled posts stay hidden from the public API until their time.
drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select to anon, authenticated
  using (published and (publish_at is null or publish_at <= now()));

------------------------------------------------------------------ Visitor analytics
create table if not exists page_views (
  id bigint generated always as identity primary key,
  type text not null default 'view' check (type in ('view', 'lead')),
  path text not null,
  visitor_id text not null,
  session_id text not null,
  referrer_host text not null default '',
  source text not null default 'direct',
  source_name text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  device text not null default '',
  country text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on page_views (created_at desc);
create index if not exists page_views_session_idx on page_views (session_id, created_at);
alter table page_views enable row level security;

create or replace function traffic_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with v as (
    select * from page_views where created_at >= p_from and created_at < p_to
  ),
  s as (
    select distinct on (session_id) session_id, source, source_name, device, country, path as landing
    from v where type = 'view'
    order by session_id, created_at
  )
  select jsonb_build_object(
    'views', (select count(*) from v where type = 'view'),
    'visitors', (select count(distinct visitor_id) from v),
    'sessions', (select count(*) from s),
    'leads', (select count(*) from v where type = 'lead'),
    'daily', coalesce((select jsonb_agg(d order by d.day) from (
      select (created_at at time zone 'utc')::date as day,
             count(distinct session_id) as sessions,
             count(*) filter (where type = 'view') as views
      from v group by 1) d), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(p) from (
      select path, count(*) as views, count(distinct visitor_id) as visitors
      from v where type = 'view' group by path order by views desc limit 10) p), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(x) from (
      select source, count(*) as sessions from s group by source order by sessions desc) x), '[]'::jsonb),
    'names', coalesce((select jsonb_agg(x) from (
      select source, source_name as name, count(*) as sessions from s
      group by source, source_name order by sessions desc limit 15) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (
      select device, count(*) as sessions from s group by device order by sessions desc) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(x) from (
      select country, count(*) as sessions from s where country <> '' group by country order by sessions desc limit 10) x), '[]'::jsonb),
    'landing', coalesce((select jsonb_agg(x) from (
      select landing as path, count(*) as sessions from s group by landing order by sessions desc limit 10) x), '[]'::jsonb),
    'lead_sources', coalesce((select jsonb_agg(x) from (
      select s.source, count(*) as leads from v join s using (session_id)
      where v.type = 'lead' group by s.source order by leads desc) x), '[]'::jsonb)
  );
$$;

revoke all on function traffic_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function traffic_summary(timestamptz, timestamptz) to service_role;

------------------------------------------------------------------ Tasks and time
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  client text not null default '',
  assignee_id uuid references admins(id) on delete set null,
  assignee_name text not null default '',
  created_by uuid references admins(id) on delete set null,
  created_by_name text not null default '',
  due_at timestamptz,
  estimate_minutes int not null default 0,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_assignee_idx on tasks (assignee_id, status);
create index if not exists tasks_due_idx on tasks (due_at) where status <> 'done';
alter table tasks enable row level security;

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references admins(id) on delete cascade,
  user_name text not null default '',
  task_id uuid references tasks(id) on delete set null,
  task_title text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists time_entries_user_idx on time_entries (user_id, started_at desc);
create index if not exists time_entries_task_idx on time_entries (task_id);
-- At most one running timer per person.
create unique index if not exists time_entries_one_running on time_entries (user_id) where ended_at is null;
alter table time_entries enable row level security;

create or replace view task_time with (security_invoker = true) as
  select task_id, sum(minutes)::int as minutes from time_entries where task_id is not null group by task_id;

------------------------------------------------------------------ Chat and notifications
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'general',
  user_id uuid references admins(id) on delete set null,
  user_name text not null default '',
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_channel_idx on chat_messages (channel, created_at desc);
alter table chat_messages enable row level security;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references admins(id) on delete cascade,
  kind text not null default 'info',
  body text not null,
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
alter table notifications enable row level security;

------------------------------------------------------------------ Trend watch
create table if not exists trend_reports (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  title text not null default '',
  summary text not null default '',
  items jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists trend_reports_created_idx on trend_reports (created_at desc);
alter table trend_reports enable row level security;

-- No policies on the new tables: only the server (service role) reads and writes them.
