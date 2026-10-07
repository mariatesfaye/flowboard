# FlowBoard

FlowBoard is a lightweight, real-time collaborative Kanban app for small product and engineering teams (roughly 2–20 people). It covers workspaces, projects, boards, tasks, comments, activity history, and live board sync—without the complexity of enterprise PM tools.

## Features

- **Auth** — Register, login, logout, JWT sessions via httpOnly cookies
- **Workspaces** — Create workspaces, invite members by email, roles (owner / member / viewer)
- **Projects** — Create projects; each gets a default board with Todo, In Progress, Done
- **Kanban** — Drag-and-drop tasks, optimistic moves with rollback, persisted ordering
- **Tasks** — Title, description, status (column), priority, assignee, due date, labels, comments
- **Realtime** — Socket.IO board rooms for task and comment events
- **Activity** — Human-readable workspace activity feed

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, @dnd-kit |
| Backend | NestJS 11, REST, Socket.IO |
| Database | PostgreSQL 16, Prisma ORM |
| Dev | Docker Compose (PostgreSQL) |

## Architecture

```text
┌──────────────┐   REST (/api → rewrite)    ┌──────────────┐
│   Next.js    │ ─────────────────────────► │    NestJS    │
│   frontend   │   WebSocket (Socket.IO)    │   backend    │
└──────────────┘ ◄───────────────────────── └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  PostgreSQL  │
                                            └──────────────┘
```

### Repository layout

```text
flowboard/
├── frontend/          # Next.js app (features/, components/, app/)
├── backend/           # NestJS modules by domain (auth, workspaces, tasks, …)
├── docker-compose.yml
└── README.md
```

### Authentication

- Passwords hashed with bcrypt
- JWT stored in httpOnly cookie (`flowboard_token`); Bearer token also supported
- NestJS `JwtAuthGuard` on protected routes; workspace membership checked in services

### Realtime

- Clients connect with credentials, emit `board.join` / `board.leave` with `{ boardId }`
- Server emits to room `board:{boardId}` only
- Events: `task.created`, `task.updated`, `task.moved`, `task.deleted`, `comment.created`, `comment.updated`
- **Optimistic moves + dedupe:** local tab marks a pending mutation key; when the same update arrives via socket, the actor skips re-applying it. Other clients apply normally.

### Authorization

- Workspace-scoped access via `WorkspaceAccessService`
- Task assignees must belong to the workspace; labels must belong to the workspace

## Local development

### Prerequisites

- Node.js 20+
- Docker

### 1. PostgreSQL

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # or use the provided local .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: `http://localhost:3000` (API proxied via Next rewrites to `/api/*`)

### Demo seed

| Email | Password |
|--------|----------|
| `maria@flowboard.dev` | `password123` |

Also: `alex@flowboard.dev`, `sam@flowboard.dev` (same password).

## Environment variables

**Backend (`backend/.env`)**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret (use a long random value in production) |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `PORT` | Default `3001` |
| `FRONTEND_URL` | CORS origin, default `http://localhost:3000` |

**Frontend (`frontend/.env.local`)**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL for rewrites |
| `NEXT_PUBLIC_WS_URL` | Socket.IO URL |

## Database

- Schema: `backend/prisma/schema.prisma`
- Migrations: `npx prisma migrate deploy` (or `migrate dev` in development)
- Seed: `npm run prisma:seed` (runs `prisma db seed`)

## Testing

```bash
cd backend
npm test              # unit tests (auth, workspace access)
npm run test:e2e      # smoke e2e (requires DATABASE_URL and migrated DB)
```

```bash
cd frontend
npm test              # activity formatter unit test (if configured)
```

## Key engineering decisions

- **Monorepo folders** (`frontend/` + `backend/`) — simple to navigate for portfolio review
- **REST + Socket.IO** — boring, well-understood realtime pattern
- **Prisma in services** — no extra repository layer
- **Activity table** — readable history, not event sourcing
- **No Redis** — single-process Socket.IO is enough for MVP scope

## Future improvements (out of scope)

- Email invites, OAuth, attachments, notifications, billing, advanced permissions, multi-region scaling, Redis Socket.IO adapter

## License

MIT — portfolio / educational use.
