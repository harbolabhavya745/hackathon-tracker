# 🏆 Hackathon Tracker

A lightweight, single-file web app to manage hackathon participation — track registrations, team members, deadlines, and tasks. Works in **Demo mode** (localStorage) or connects to a **Supabase** backend for persistent, multi-device storage.

---

## Features

- **Dashboard** — metrics overview, completion progress, upcoming dates
- **Registration** — track status (not started / pending / registered / cancelled), team name, track, ref ID, and notes
- **Team** — add/edit/remove team members with roles and emails
- **Dates** — manage events, deadlines, milestones
- **Tasks** — priority-tagged checklist with assignment support
- **Multi-hackathon** — sidebar switcher to manage multiple hackathons at once
- **Import** — bulk import via CSV, JSON, or manual form
- **Demo mode** — fully functional offline with localStorage, no backend needed
- **Dark mode** — auto-follows system preference

---

## Getting Started

### Option 1 — Demo Mode (no backend)

1. Open `index.html` in any browser.
2. Click **Try Demo** on the config screen.
3. All data is saved to `localStorage`.

### Option 2 — Supabase Backend

1. Create a free project at [supabase.com](https://supabase.com).
2. Run `supabase_schema.sql` in the **SQL Editor** of your Supabase project.
3. Copy your **Project URL** and **anon public key** from *Settings → API*.
4. Open `index.html`, paste the URL and key, and click **Connect**.

---

## File Structure

```
hackathon-tracker/
├── index.html            # Complete single-file app (HTML + CSS + JS)
├── supabase_schema.sql   # Database schema for Supabase backend
├── docs/
│   ├── SETUP.md          # Detailed setup & configuration guide
│   └── IMPORT_FORMAT.md  # CSV / JSON import format reference
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── .gitignore
├── LICENSE
└── README.md
```

---

## Database Schema

Five tables, all linked to `hackathons` via foreign key:

| Table | Purpose |
|---|---|
| `hackathons` | Core hackathon info (name, description, tags) |
| `registrations` | 1-to-1 registration status & metadata |
| `team_members` | Team roster per hackathon |
| `dates` | Events, deadlines, milestones |
| `tasks` | To-do items with priority & assignment |

Row Level Security is enabled; authenticated users get full access by default (adjust policies as needed).

---

## Import Formats

### CSV
Columns: `name`, `description`, `tags` (pipe-separated)

```csv
name,description,tags
HackX 2025,Build AI tools,AI|Web|Open Source
```

### JSON
Array of objects. Nested `team`, `dates`, and `tasks` are supported:

```json
[
  {
    "name": "HackX 2025",
    "description": "Build AI tools",
    "tags": ["AI", "Web"],
    "team": [{ "name": "Alice", "role": "Backend", "email": "alice@example.com" }],
    "dates": [{ "label": "Submission", "date": "2025-09-15", "type": "deadline" }],
    "tasks": [{ "title": "Set up repo", "assigned_to": "Alice", "priority": "high" }]
  }
]
```

See `docs/IMPORT_FORMAT.md` for the full reference.

---

## Deployment

Since this is a single HTML file, deployment is zero-config:

- **GitHub Pages** — push to `main`, enable Pages from repo settings, point to root.
- **Netlify / Vercel** — drag-and-drop `index.html` or connect the repo.
- **Any static host** — just serve `index.html`.

No build step required.

---

## Contributing

1. Fork the repo and create a feature branch (`git checkout -b feat/my-feature`).
2. Make your changes in `index.html`.
3. Open a pull request — describe what changed and why.

Bug reports and feature requests are welcome via [GitHub Issues](.github/ISSUE_TEMPLATE/).

---

## License

MIT — see [LICENSE](LICENSE).
