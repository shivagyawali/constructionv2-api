# Buildersoft API

## Stack
- **Node.js + TypeScript** — Express 4, TypeORM 0.3, MySQL 2
- **Auth** — JWT access + refresh tokens, bcrypt, role-based guards
- **Features** — Roles & Permissions (DB-driven), User Management, Full CRUD for all entities, Invoice PDF, Worker Logs, Dashboard Analytics

## Quick Start

```bash
cp .env.example .env        # configure your env
npm install
npm run dev                 # development (auto-sync schema)
npm run build && npm start  # production
```

## API Base: `/api`

| Area | Routes |
|------|--------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET/PATCH /auth/profile`, `POST /auth/change-password` |
| Users (admin) | `GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/toggle-active`, `POST /users/:id/reset-password` |
| Role Permissions | `GET /role-permissions`, `GET /role-permissions/:role`, `PUT /role-permissions/:role`, `PUT /role-permissions/bulk`, `POST /role-permissions/reset` |
| Dashboard | `GET /dashboard/overview`, `GET /dashboard/labor` |
| Clients | Full CRUD + `/stats` |
| Projects | Full CRUD + `/stats` + worker assignment |
| Tasks | Full CRUD + progress + worker assignment |
| Workers | Full CRUD + `/stats` + `/logs` |
| Invoices | Full CRUD + payments + PDF + mark-sent |
| Invoice Periods | Full CRUD + `/summary` |
| Worker Logs | Full CRUD + approve/reject |

## Roles
`admin` → full access
`manager` → all features, no user management
`supervisor` → projects + tasks
`worker` → tasks only

Permissions are stored in the DB (`role_permissions` table) and can be updated live via the admin portal.
