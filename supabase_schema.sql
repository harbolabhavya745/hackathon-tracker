-- ============================================================
-- Hackathon Tracker — Supabase Schema (Updated for Auth/RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Enable Realtime for all tables ──────────────────────────
-- This is what allows Supabase to 'broadcast' changes to the frontend
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    hackathons, registrations, team_members, dates, tasks;
commit;

-- ── Step 1: Drop policies first (they depend on tables & functions) ──
drop policy if exists "users_all_hackathons"    on hackathons;
drop policy if exists "users_all_registrations" on registrations;
drop policy if exists "users_all_members"       on team_members;
drop policy if exists "users_all_dates"         on dates;
drop policy if exists "users_all_tasks"         on tasks;

-- ── Step 2: Drop function (depends on team_members) ──
drop function if exists is_team_member(uuid);

-- ── Step 3: Drop tables (now safe, no dependents) ──
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

-- 2. registrations (1-to-1 with hackathon)
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

-- ── Step 6: Auto-update updated_at ────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_hackathons_updated_at on hackathons;
create trigger trg_hackathons_updated_at
  before update on hackathons
  for each row execute function set_updated_at();

-- ── Step 7: Enable RLS ─────────────────────────────────────
alter table hackathons    enable row level security;
alter table registrations enable row level security;
alter table team_members  enable row level security;
alter table dates         enable row level security;
alter table tasks         enable row level security;

-- ── Step 8: Helper function ────────────────────────────────
create or replace function is_team_member(h_id uuid)
returns boolean as $$
begin
  if exists (select 1 from hackathons where id = h_id and user_id = auth.uid()) then
    return true;
  end if;
  return exists (
    select 1 from team_members
    where hackathon_id = h_id
    and lower(email) = lower(auth.jwt() ->> 'email')
  );
end;
$$ language plpgsql security definer;

-- ── Step 9: RLS Policies ───────────────────────────────────

-- 1. Hackathons (inline check — avoids circular dependency with is_team_member)
create policy "users_all_hackathons" on hackathons for all to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from team_members
    where hackathon_id = id
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
) with check (
  auth.uid() = user_id or exists (
    select 1 from team_members
    where hackathon_id = id
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
);

-- 2. Registrations
create policy "users_all_registrations" on registrations for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 3. Team Members
create policy "users_all_members" on team_members for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 4. Dates
create policy "users_all_dates" on dates for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);

-- 5. Tasks
create policy "users_all_tasks" on tasks for all to authenticated using (
  is_team_member(hackathon_id)
) with check (
  is_team_member(hackathon_id)
);
