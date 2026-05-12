# Team Task Manager

Full-stack web app for **projects**, **team membership**, and **tasks** with **role-based access control** (Admin vs Member). Built as a REST API (Express + Prisma + PostgreSQL) and a React (Vite) SPA.

## Features

- **Authentication:** Sign up and log in (JWT stored in the browser).
- **Projects:** Create projects; the creator becomes **ADMIN** on that project.
- **Team:** Admins invite users by **email** (user must register first) and set roles (**ADMIN** / **MEMBER**).
- **Tasks:** Create tasks with optional due date; admins assign tasks to members; track status (**TODO** / **IN_PROGRESS** / **DONE**).
- **Dashboard:** Totals by status, **overdue** tasks (due before today and not done), and per-project breakdown.
- **RBAC:**
  - **ADMIN:** Manage project settings, members, assign tasks, full task control.
  - **MEMBER:** View project and tasks; create tasks; edit/delete tasks they **created** or are **assigned** to; cannot assign others unless admin.

## Repository layout

| Path | Description |
|------|-------------|
| `server/` | Express REST API, Prisma schema & migrations |
| `client/` | React + Vite + Tailwind CSS frontend |
| `Dockerfile` | Single container: builds client + serves API + static UI |

## Prerequisites

- **Node.js 20+**
- **PostgreSQL** (local Docker Compose file included)

## Local setup

1. **Clone and install**

   ```bash
   cd "Team task manager"
   npm install
   ```

2. **Quick start without Docker**

   This starts an embedded PostgreSQL instance (port **55432**), runs migrations, then the API (**4000**) and Vite (**5173**). Press Ctrl+C to stop.

   ```bash
   npm run dev:local
   ```

   Open **http://localhost:5173**. (Requires the `embedded-postgres` dev dependency already installed with the workspace.)

3. **Start PostgreSQL** (optional local DB)

   ```bash
   docker compose up -d
   ```

4. **Environment**

   Copy `.env.example` to `.env` in the **project root** (or set variables in your shell). For the bundled Compose database:

   ```env
   DATABASE_URL="postgresql://teamtasks:teamtasks@localhost:5432/teamtasks"
   JWT_SECRET="use-a-long-random-string-in-real-deployments"
   ```

5. **Database migrations**

   ```bash
   npm run db:migrate --workspace=server
   ```

   Or from `server/`: `npx prisma migrate dev`.

6. **Run in development**

   Terminal 1 — API (port **4000**):

   ```bash
   npm run dev --workspace=server
   ```

   Terminal 2 — Vite (port **5173**, proxies `/api` to the API):

   ```bash
   npm run dev --workspace=client
   ```

   Open `http://localhost:5173`.

## Production build

```bash
npm run build
npm start
```

The server listens on `PORT` (default **4000**), runs `prisma migrate deploy`, then serves the API at `/api/*` and the React app for all other routes.

## Deploy on Railway (mandatory for submission)

1. Create a **new Railway project** and add the **PostgreSQL** plugin.
2. Connect this **GitHub repo** (or deploy from the CLI) and set the **root directory** to the repository root (where this `README` lives).
3. **Variables** (Railway → Variables):

   - `DATABASE_URL` — use the variable **provided by the Postgres service** (reference it from the web service).
   - `JWT_SECRET` — long random string (e.g. 32+ bytes).
   - Optional: `CLIENT_ORIGIN` — only if the browser origin differs from your API origin (same-origin Railway deploys usually do not need this).

4. **Build & start**

   - **Dockerfile** deploy: Railway can use the included `Dockerfile` and `railway.toml` (builder `DOCKERFILE`).
   - Ensure the deployed service **exposes HTTP** and uses the **PORT** Railway injects (the app reads `process.env.PORT`).

5. After deploy, open your Railway URL, register two users, create a project, invite the second user by email, and verify Admin vs Member behavior.

## Submission checklist

- [ ] Live URL (Railway)
- [ ] GitHub repository link
- [ ] This README (updated with your URLs if you wish)
- [ ] 2–5 minute demo video (signup, project, invite, tasks, dashboard, RBAC)

## API overview

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/signup` | `{ email, password, name }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/dashboard/summary` | Dashboard aggregates |
| GET/POST | `/api/projects` | List / create |
| GET/PATCH/DELETE | `/api/projects/:projectId` | Member read; admin write/delete |
| GET/POST | `/api/projects/:projectId/members` | Admin adds members |
| PATCH/DELETE | `/api/projects/:projectId/members/:userId` | Admin |
| GET/POST | `/api/projects/:projectId/tasks` | Tasks |
| PATCH/DELETE | `/api/projects/:projectId/tasks/:taskId` | RBAC per rules above |

All authenticated routes expect: `Authorization: Bearer <token>`.

## License

Provided for evaluation / coursework use.
