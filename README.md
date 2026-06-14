# 🏆 Hackathon Tracker (Modular Version)

A professional, modular web application to manage hackathon participation. Built with **Vite**, **TypeScript**, and **Supabase**.

---

## Features

- **Authentication** — Secure Login and Signup using Supabase Auth.
- **Multi-user** — Each user manages their own private hackathons.
- **Dashboard** — Metrics overview, completion progress, and upcoming dates.
- **Modular Code** — Clean separation of API, components, and styles.
- **Type Safe** — Full TypeScript implementation for robust development.
- **Responsive** — Works great on desktop and mobile.

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com) project.

### 2. Database Setup
1. Go to your Supabase project's **SQL Editor**.
2. Run the contents of `supabase_schema.sql`. This sets up the tables and Row Level Security (RLS).

### 3. Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Supabase URL and Anon Key:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 4. Build for Production
To generate a production-ready build in the `dist/` folder:
```bash
npm run build
```

---

## Project Structure

```
hackathon-tracker/
├── src/
│   ├── api/          # Supabase client and service layers
│   ├── components/   # UI components and view logic
│   ├── styles/       # Organized CSS
│   ├── utils/        # UI helpers and utilities
│   ├── types.ts      # TypeScript interfaces
│   └── main.ts       # Application entry point & state management
├── index.html        # Clean entry point
├── supabase_schema.sql # Updated SQL schema with RLS
└── vite.config.ts    # Vite configuration
```

---

## License

MIT — see [LICENSE](LICENSE).
