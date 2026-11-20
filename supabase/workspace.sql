-- Project workspace: projects, task steps, submissions/review, points and weekly updates.
-- Run after growth.sql. Safe to run more than once.

------------------------------------------------------------------ Projects
create table if not exists work_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '',
  description text not null default '',
  color text not null default 'moss',
  status text not null default 'active' check (status in ('planning', 'active', 'paused', 'done')),
  start_date date,
  due_date date,
  lead_id uuid references admins(id) on delete set null,
  lead_name text not null default '',
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists work_projects_status_idx on work_projects (status);
alter table work_projects enable row level security;

------------------------------------------------------------------ Task additions
alter table tasks add column if not exists project_id uuid references work_projects(id) on delete set null;
alter table tasks add column if not exists points int not null default 0;
alter table tasks add column if not exists start_at timestamptz;
alter table tasks add column if not exists submitted_at timestamptz;
alter table tasks add column if not exists submission_note text not null default '';
alter table tasks add column if not exists submission_url text not null default '';
alter table tasks add column if not exists approved_by_name text not null default '';
create index if not exists tasks_project_idx on tasks (project_id, status);

------------------------------------------------------------------ Steps (checklist)
create table if not exists task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  done boolean not null default false,
  done_at timestamptz,
  done_by_name text not null default '',
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists task_steps_task_idx on task_steps (task_id, position);
alter table task_steps enable row level security;

------------------------------------------------------------------ Task thread (comments, submissions, reviews)
create table if not exists task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references admins(id) on delete set null,
  user_name text not null default '',
  kind text not null default 'comment' check (kind in ('comment', 'submitted', 'approved', 'changes')),
  body text not null default '',
  link text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists task_updates_task_idx on task_updates (task_id, created_at desc);
alter table task_updates enable row level security;

------------------------------------------------------------------ Weekly updates
create table if not exists weekly_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references admins(id) on delete cascade,
  user_name text not null default '',
  week_of date not null,
  done text not null default '',
  next text not null default '',
  blockers text not null default '',
  mood int not null default 3 check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_of)
);
create index if not exists weekly_updates_week_idx on weekly_updates (week_of desc);
alter table weekly_updates enable row level security;

-- No policies: only the server (service role) reads and writes these tables.
