# Import Format Reference

The app supports three import methods: **CSV**, **JSON**, and a **manual form**. All are available via the *Import* button in the top bar.

---

## CSV

Comma-separated values. The first row must be a header.

### Required columns

| Column | Description |
|---|---|
| `name` | Hackathon name *(required)* |
| `description` | Short description |
| `tags` | Pipe-separated list, e.g. `AI\|Web\|Open Source` |

### Example

```csv
name,description,tags
HackX 2025,Build AI tools for good,AI|Web
DevFest Delhi,Annual Google developer festival,Google|Android|Cloud
BioHack,Biotech and health innovation,Health|Bio
```

> Tags use `|` as the separator (not comma) so the CSV format isn't broken.

---

## JSON

An array of objects. Nested `team`, `dates`, and `tasks` collections are fully supported and will be inserted alongside the hackathon.

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Hackathon name *(required)* |
| `description` | string | Short description |
| `tags` | string[] | Array of tag strings |
| `team` | TeamMember[] | Team roster |
| `dates` | DateEntry[] | Events / deadlines |
| `tasks` | Task[] | To-do items |

### `TeamMember` object

| Field | Type | Description |
|---|---|---|
| `name` | string | Member name *(required)* |
| `role` | string | Role / title |
| `email` | string | Email address |

### `DateEntry` object

| Field | Type | Description |
|---|---|---|
| `label` | string | Label for the date *(required)* |
| `date` | string | Date in `YYYY-MM-DD` format *(required)* |
| `type` | string | One of `event`, `deadline`, `milestone`, `info` (default: `event`) |

### `Task` object

| Field | Type | Description |
|---|---|---|
| `title` | string | Task description *(required)* |
| `assigned_to` | string | Assignee name (alias: `who`) |
| `priority` | string | `high`, `med`, or `low` (alias: `pri`, default: `med`) |
| `done` | boolean | Completion state (default: `false`) |

### Full example

```json
[
  {
    "name": "HackX 2025",
    "description": "Build AI tools for good",
    "tags": ["AI", "Web", "Open Source"],
    "team": [
      { "name": "Alice", "role": "Backend", "email": "alice@example.com" },
      { "name": "Bob",   "role": "Design",  "email": "bob@example.com" }
    ],
    "dates": [
      { "label": "Kick-off",   "date": "2025-09-01", "type": "event" },
      { "label": "Submission", "date": "2025-09-14", "type": "deadline" },
      { "label": "Results",    "date": "2025-09-20", "type": "milestone" }
    ],
    "tasks": [
      { "title": "Set up GitHub repo",      "assigned_to": "Alice", "priority": "high" },
      { "title": "Create landing page",     "assigned_to": "Bob",   "priority": "med"  },
      { "title": "Submit project",          "assigned_to": "Alice", "priority": "high", "done": false }
    ]
  }
]
```

---

## Manual Form

Use the **Form** tab in the import dialog to enter hackathons one by one without preparing a file. Click **Add another hackathon** to add more rows, then **Import all**.

Fields available: Name, Description, Tags (comma-separated).

> The form import doesn't support nested team / dates / tasks — add those after importing via the individual tab views.
