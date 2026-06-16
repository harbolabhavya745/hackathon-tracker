-- ============================================================
-- Hackathon Tracker — Supabase Schema (Updated for Auth/RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Enable Realtime for all tables ──────────────────────────
-- We do this at the very beginning to ensure it's registered
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    hackathons, registrations, team_members, dates, tasks;
commit;

-- ── Step 1: Drop policies first ──
drop policy if exists "users_all_hackathons"    on hackathons;
drop policy if exists "users_all_registrations" on registrations;
drop policy if exists "users_all_members"       on team_members;
drop policy if exists "users_all_dates"         on dates;
drop policy if exists "users_all_tasks"         on tasks;

-- ── Step 2: Drop function ──
drop function if exists is_team_member(uuid);

-- ── Step 3: Drop tables (order matters) ──
drop table if exists tasks;
drop table if exists dates;
drop table if exists team_members;
drop table if exists registrations;
drop table if exists hackathons;

-- ── Step 4: Recreate tables ────────────────────────────────

-- 1. hackathons
create table hackathons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  name        text not null,
  description text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. registrations
create table registrations (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  status       text not null default 'not_started'
                 check (status in ('not_started','pending','registered','cancelled')),
  team_name    text not null default '',
  track        text not null default '',
  ref_id       text not null default '',
  link         text not null default '',
  notes        text not null default '',
  unique (hackathon_id)
);

-- 3. team_members
create table team_members (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  name         text not null,
  role         text not null default '',
  email        text not null default '',
  created_at   timestamptz not null default now()
);

-- 4. dates
create table dates (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  label        text not null,
  date         date not null,
  type         text not null default 'event'
                 check (type in ('event','deadline','milestone','info')),
  created_at   timestamptz not null default now()
);

-- 5. tasks
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  title        text not null,
  done         boolean not null default false,
  assigned_to  text not null default '',
  priority     text not null default 'med'
                 check (priority in ('high','med','low')),
  created_at   timestamptz not null default now()
);

-- ── Step 5: Indexes ────────────────────────────────────────
create index idx_reg_hack     on registrations(hackathon_id);
create index idx_members_hack on team_members(hackathon_id);
create index idx_dates_hack   on dates(hackathon_id);
create index idx_tasks_hack   on tasks(hackathon_id);

-- ── Step 6: Enable RLS ─────────────────────────────────────
alter table hackathons    enable row level security;
alter table registrations enable row level security;
alter table team_members  enable row level security;
alter table dates         enable row level security;
alter table tasks         enable row level security;

-- ── Step 7: Simplified Helper function ─────────────────────
create or replace function get_accessible_hackathons()
returns setof uuid as $$
begin
  return query
  select id from hackathons where user_id = auth.uid()
  union
  select hackathon_id from team_members where lower(email) = lower(auth.jwt() ->> 'email');
end;
$$ language plpgsql security definer set search_path = public;

-- ── Step 8: RLS Policies ───────────────────────────────────

-- 1. Hackathons (Split policies to prevent team members from deleting or updating)
drop policy if exists "users_all_hackathons" on hackathons;

create policy "hackathons_select" on hackathons for select to authenticated using (
  id in (select get_accessible_hackathons())
);

create policy "hackathons_insert" on hackathons for insert to authenticated with check (
  auth.uid() = user_id
);

create policy "hackathons_update" on hackathons for update to authenticated using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

create policy "hackathons_delete" on hackathons for delete to authenticated using (
  auth.uid() = user_id
);

-- 2. Registrations
create policy "users_all_registrations" on registrations for all to authenticated using (
  hackathon_id in (select get_accessible_hackathons())
) with check (
  hackathon_id in (select get_accessible_hackathons())
);

-- 3. Team Members
create policy "users_all_members" on team_members for all to authenticated using (
  hackathon_id in (select get_accessible_hackathons())
) with check (
  hackathon_id in (select get_accessible_hackathons())
);

-- 4. Dates
create policy "users_all_dates" on dates for all to authenticated using (
  hackathon_id in (select get_accessible_hackathons())
) with check (
  hackathon_id in (select get_accessible_hackathons())
);

-- 5. Tasks
create policy "users_all_tasks" on tasks for all to authenticated using (
  hackathon_id in (select get_accessible_hackathons())
) with check (
  hackathon_id in (select get_accessible_hackathons())
);
