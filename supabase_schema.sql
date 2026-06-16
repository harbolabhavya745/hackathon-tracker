-- ============================================================
-- Hackathon Tracker — Supabase Schema (Updated for Auth/RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Cleanup existing tables (order matters for foreign keys)
drop table if exists tasks;
drop table if exists dates;
drop table if exists team_members;
drop table if exists registrations;
drop table if exists hackathons;

-- 1. hackathons
create table if not exists hackathons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  name        text not null,
  description text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. registrations (1-to-1 with hackathon)
create table if not exists registrations (
  id          uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  status      text not null default 'not_started'
                check (status in ('not_started','pending','registered','cancelled')),
  team_name   text not null default '',
  track       text not null default '',
  ref_id      text not null default '',
  link        text not null default '',
  notes       text not null default '',
  unique (hackathon_id)
);

-- 3. team_members
create table if not exists team_members (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  name         text not null,
  role         text not null default '',
  email        text not null default '',
  created_at   timestamptz not null default now()
);

-- 4. dates
create table if not exists dates (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  label        text not null,
  date         date not null,
  type         text not null default 'event'
                check (type in ('event','deadline','milestone','info')),
  created_at   timestamptz not null default now()
);

-- 5. tasks
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  title        text not null,
  done         boolean not null default false,
  assigned_to  text not null default '',
  priority     text not null default 'med'
                check (priority in ('high','med','low')),
  created_at   timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists idx_reg_hack      on registrations(hackathon_id);
create index if not exists idx_members_hack  on team_members(hackathon_id);
create index if not exists idx_dates_hack    on dates(hackathon_id);
create index if not exists idx_tasks_hack    on tasks(hackathon_id);

-- ── Auto-update updated_at ─────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_hackathons_updated_at on hackathons;
create trigger trg_hackathons_updated_at
  before update on hackathons
  for each row execute function set_updated_at();

-- ── Row Level Security ──
alter table hackathons   enable row level security;
alter table registrations enable row level security;
alter table team_members  enable row level security;
alter table dates         enable row level security;
alter table tasks         enable row level security;

-- Policies: Allow owners and team members to see/edit data
create or replace function is_team_member(h_id uuid)
returns boolean as $$
begin
  -- Check if owner
  if exists (select 1 from hackathons where id = h_id and user_id = auth.uid()) then
    return true;
  end if;
  -- Check if teammate (case-insensitive email)
  return exists (
    select 1 from team_members 
    where hackathon_id = h_id 
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
end;
$$ language plpgsql security definer;

-- 1. Hackathons
drop policy if exists "users_all_hackathons" on hackathons;
create policy "users_all_hackathons" on hackathons for all to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from team_members where hackathon_id = id and lower(email) = lower(auth.jwt() ->> 'email')
  )
) with check (
  auth.uid() = user_id or exists (
    select 1 from team_members where hackathon_id = id and lower(email) = lower(auth.jwt() ->> 'email')
  )
);

-- 2. Registrations
drop policy if exists "users_all_registrations" on registrations;
create policy "users_all_registrations" on registrations for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 3. Team Members
drop policy if exists "users_all_members" on team_members;
create policy "users_all_members" on team_members for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 4. Dates
drop policy if exists "users_all_dates" on dates;
create policy "users_all_dates" on dates for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 5. Tasks
drop policy if exists "users_all_tasks" on tasks;
create policy "users_all_tasks" on tasks for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);
