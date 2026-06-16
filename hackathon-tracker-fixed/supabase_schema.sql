-- ============================================================
-- Hackathon Tracker — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Enable Realtime for all tables ──────────────────────────
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    hackathons, registrations, team_members, dates, tasks;
commit;

-- ── Step 1: Drop policies ──
drop policy if exists "users_all_hackathons"    on hackathons;
drop policy if exists "owner_write_hackathons"  on hackathons;
drop policy if exists "users_all_registrations" on registrations;
drop policy if exists "users_all_members"       on team_members;
drop policy if exists "users_all_dates"         on dates;
drop policy if exists "users_all_tasks"         on tasks;

-- ── Step 2: Drop helper function (no longer needed) ──
drop function if exists is_team_member(uuid);

-- ── Step 3: Drop tables (order matters) ──
drop table if exists tasks;
drop table if exists dates;
drop table if exists team_members;
drop table if exists registrations;
drop table if exists hackathons;

-- ── Step 4: Recreate tables ────────────────────────────────

create table hackathons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  name        text not null,
  description text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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

create table team_members (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  name         text not null,
  role         text not null default '',
  email        text not null default '',
  created_at   timestamptz not null default now()
);

create table dates (
  id           uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  label        text not null,
  date         date not null,
  type         text not null default 'event'
                 check (type in ('event','deadline','milestone','info')),
  created_at   timestamptz not null default now()
);

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

-- ── Step 7: Flat RLS Policies ──────────────────────────────
-- No helper function. Each policy uses a direct inline subquery against
-- auth.users (always current) so new teammates see data immediately
-- without needing to log out or clear cookies.

-- hackathons: owner can do everything; teammates can only SELECT
create policy "hackathons_owner_all" on hackathons
  for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "hackathons_teammate_select" on hackathons
  for select to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.hackathon_id = id
        and lower(tm.email) = (
          select lower(au.email) from auth.users au where au.id = auth.uid()
        )
    )
  );

-- registrations: owner or teammate
create policy "registrations_access" on registrations
  for all to authenticated
  using (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  );

-- team_members: owner or teammate
create policy "team_members_access" on team_members
  for all to authenticated
  using (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  );

-- dates: owner or teammate
create policy "dates_access" on dates
  for all to authenticated
  using (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  );

-- tasks: owner or teammate
create policy "tasks_access" on tasks
  for all to authenticated
  using (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from hackathons h
      where h.id = hackathon_id
        and (
          h.user_id = auth.uid()
          or exists (
            select 1 from team_members tm
            where tm.hackathon_id = hackathon_id
              and lower(tm.email) = (
                select lower(au.email) from auth.users au where au.id = auth.uid()
              )
          )
        )
    )
  );
