# Setup Guide

## Prerequisites

- A modern browser (Chrome, Firefox, Safari, Edge)
- A [Supabase](https://supabase.com) account (free tier works) — *only if using the backend*

---

## Demo Mode

Demo mode stores all data in `localStorage`. No account or internet connection required beyond loading the page.

1. Open `index.html` in your browser.
2. Click **Try Demo** on the config screen.
3. Create hackathons, add team members, tasks, and dates freely.
4. Data persists across page reloads within the same browser.

> **Note:** Clearing browser storage or using a private/incognito window will reset demo data.

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organisation, name your project, set a database password, and select a region close to your users.
3. Wait for provisioning (~1–2 minutes).

### 2. Apply the Schema

1. In the Supabase dashboard, navigate to **SQL Editor**.
2. Click **New Query**.
3. Paste the entire contents of `supabase_schema.sql`.
4. Click **Run**.

This creates the five tables (`hackathons`, `registrations`, `team_members`, `dates`, `tasks`), indexes, the `updated_at` trigger, and default RLS policies.

### 3. Get Your API Credentials

1. Go to **Settings → API** in your project dashboard.
2. Copy the **Project URL** (e.g. `https://xyzabc.supabase.co`).
3. Copy the **anon public** key (safe to use client-side).

### 4. Connect the App

1. Open `index.html` in your browser.
2. Paste the Project URL and anon key into the config screen.
3. Click **Connect**.

Credentials are saved to `localStorage` so you only need to enter them once per browser.

---

## Row Level Security

The schema enables RLS on all tables and creates a permissive policy for `authenticated` users. For a personal/team setup this is sufficient. If you expose the app publicly, you should tighten policies:

```sql
-- Example: restrict to the authenticated user's own data
-- Add a user_id column and reference auth.uid()
alter table hackathons add column user_id uuid references auth.users(id);

create policy "own_hackathons" on hackathons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

---

## Deployment

### GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to `Deploy from a branch`, select `main`, and root `/`.
4. Your app will be live at `https://<username>.github.io/<repo-name>/`.

### Netlify

1. Log in to [netlify.com](https://netlify.com).
2. Drag the `hackathon-tracker/` folder onto the Netlify drop zone, **or** connect the GitHub repo.
3. Netlify auto-detects a static site — no build command needed.

### Vercel

1. Install the [Vercel CLI](https://vercel.com/cli): `npm i -g vercel`
2. Run `vercel` from the `hackathon-tracker/` directory.
3. Follow the prompts — select "Other" for framework preset.

---

## Resetting Data

**Demo mode:** Open DevTools → Application → Local Storage → delete keys prefixed with `ht_`.

**Supabase:** Run `DELETE FROM hackathons;` in the SQL Editor (cascades to all related tables).
