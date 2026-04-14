# Buildersoft API

Express.js + TypeScript + TypeORM + MySQL REST API for construction management.

## Features

- **Auth** — JWT access/refresh tokens, bcrypt password hashing, role-based access
- **Clients** — Full CRUD, stats
- **Projects** — Full CRUD, budget tracking, auto progress sync from tasks
- **Tasks** — Per-project task management, progress slider syncs project progress
- **Workers** — Worker profiles with trade, rates, license tracking
- **Worker Logs** — Time tracking per worker/project/task, approve/reject workflow, bulk operations, summary reports
- **Invoices** — Standard invoices + **auto-generate from worker logs** (group by worker, day, or log), PDF download via PDFKit
- **Payments** — Record payments, auto-update invoice status

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit DB credentials and JWT secrets

# 3. Create MySQL database
mysql -u root -p -e "CREATE DATABASE buildersoft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Run (synchronize=true auto-creates tables in development)
npm run dev
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/profile` | Get profile |
| PATCH | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |

### Clients
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | List clients (`?search=&limit=&offset=`) |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id` | Get client |
| PATCH | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| GET | `/api/clients/:id/stats` | Client stats |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects (`?status=&clientId=&priority=`) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/stats` | Full project stats (tasks, invoices, worker logs, budget) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks/project/:projectId` | List tasks for project |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PATCH | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/progress` | Update progress (auto-syncs project %) |
| DELETE | `/api/tasks/:id` | Delete task |

### Workers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workers` | List workers (`?status=&trade=&search=`) |
| POST | `/api/workers` | Create worker |
| GET | `/api/workers/:id` | Get worker |
| PATCH | `/api/workers/:id` | Update worker |
| DELETE | `/api/workers/:id` | Delete worker |
| GET | `/api/workers/:id/stats` | Hours, cost, projects (`?from=&to=`) |
| GET | `/api/workers/:id/logs` | Worker's time logs |

### Worker Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/worker-logs` | List logs (`?projectId=&workerId=&status=&from=&to=`) |
| POST | `/api/worker-logs` | Create log |
| POST | `/api/worker-logs/bulk` | Create multiple logs at once |
| GET | `/api/worker-logs/summary` | Summary report (`?groupBy=worker\|project\|date`) |
| GET | `/api/worker-logs/:id` | Get log |
| PATCH | `/api/worker-logs/:id` | Update log |
| DELETE | `/api/worker-logs/:id` | Delete log |
| PATCH | `/api/worker-logs/:id/approve` | Approve log |
| PATCH | `/api/worker-logs/:id/reject` | Reject log (`{ reason }`) |
| POST | `/api/worker-logs/bulk-approve` | Bulk approve (`{ ids: [] }`) |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List invoices (`?status=&clientId=&projectId=`) |
| POST | `/api/invoices` | Create standard invoice |
| POST | `/api/invoices/from-worker-logs` | **Generate invoice from worker logs** |
| GET | `/api/invoices/:id` | Get invoice |
| PATCH | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Delete invoice |
| GET | `/api/invoices/:id/pdf` | **Download PDF** |
| PATCH | `/api/invoices/:id/send` | Mark as sent |
| POST | `/api/invoices/:id/payments` | Record payment |
| GET | `/api/invoices/:id/payments` | List payments |

## Generate Invoice from Worker Logs

```json
POST /api/invoices/from-worker-logs
{
  "projectId": "uuid",
  "clientId": "uuid",
  "issueDate": "2024-03-01",
  "dueDate": "2024-03-31",
  "groupBy": "worker",   // "worker" | "day" | "log"
  "logIds": [],          // optional — leave empty to include all approved logs
  "taxRate": 13,
  "notes": "Payment due within 30 days"
}
```

`groupBy` options:
- `worker` — one line item per worker (aggregate)
- `day` — one line item per date
- `log` — one line item per individual log entry

## Worker Log Lifecycle

```
created → pending → approved → invoiced
                 ↘ rejected
```

Only `approved` logs can be invoiced. Once invoiced the log is locked.

## Environment Variables

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=buildersoft
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change_me_too
JWT_REFRESH_EXPIRES_IN=30d
```
