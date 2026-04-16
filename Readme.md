# Buildersoft API

Clean, scalable Node.js + TypeScript + TypeORM + MySQL REST API for construction management.

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **ORM**: TypeORM 0.3 (MySQL)
- **Auth**: JWT (access + refresh tokens)
- **Validation**: express-validator

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure env
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secrets

# 3. Development (auto-sync schema)
npm run dev

# 4. Production (use migrations)
npm run migration:generate -- -n InitialMigration
npm run migration:run
npm run build
npm start
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/profile | Get current user |
| PATCH | /api/auth/profile | Update profile |
| POST | /api/auth/change-password | Change password |

### Clients
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/clients | List clients |
| POST | /api/clients | Create client |
| GET | /api/clients/:id | Get client |
| PATCH | /api/clients/:id | Update client |
| DELETE | /api/clients/:id | Delete client |
| GET | /api/clients/:id/stats | Client stats |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project (with workers) |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/projects/:id/stats | Project stats |
| POST | /api/projects/:id/workers | Assign worker |
| DELETE | /api/projects/:id/workers/:workerId | Remove worker |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks/project/:projectId | List tasks by project |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task |
| PATCH | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/progress | Update progress |
| DELETE | /api/tasks/:id | Delete task |
| POST | /api/tasks/:id/workers | Assign worker to task |
| DELETE | /api/tasks/:id/workers/:workerId | Remove worker from task |

### Workers
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/workers | List workers |
| POST | /api/workers | Create worker |
| GET | /api/workers/:id | Get worker |
| PATCH | /api/workers/:id | Update worker |
| DELETE | /api/workers/:id | Delete worker |
| GET | /api/workers/:id/stats | Worker stats |
| GET | /api/workers/:id/logs | Worker logs |

### Worker Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/worker-logs | List all logs |
| POST | /api/worker-logs | Create log entry |
| GET | /api/worker-logs/:id | Get log |
| PATCH | /api/worker-logs/:id | Update log |
| DELETE | /api/worker-logs/:id | Delete log |
| POST | /api/worker-logs/:id/approve | Approve log |
| POST | /api/worker-logs/:id/reject | Reject log |
| POST | /api/worker-logs/bulk/approve | Bulk approve |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/invoices | List invoices |
| POST | /api/invoices | Create invoice |
| GET | /api/invoices/:id | Get invoice |
| PATCH | /api/invoices/:id | Update invoice |
| DELETE | /api/invoices/:id | Delete invoice |
| POST | /api/invoices/:id/payments | Record payment |
| GET | /api/invoices/:id/payments | List payments |
| POST | /api/invoices/:id/send | Mark as sent |
| GET | /api/invoices/:id/pdf | Download PDF |

### Invoice Periods (Worker Pay Periods)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/invoice-periods | List pay periods |
| GET | /api/invoice-periods/summary | Summary by worker |
| POST | /api/invoice-periods | Create pay period |
| GET | /api/invoice-periods/:id | Get period |
| PATCH | /api/invoice-periods/:id | Update period |
| DELETE | /api/invoice-periods/:id | Delete period |

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "pages": 5,
    "currentPage": 1
  }
}
```

## Database Schema (auto-sync in dev)

Tables created automatically:
- `users`
- `clients`
- `workers`
- `projects`
- `project_workers` (join table)
- `tasks`
- `task_workers` (join table)
- `invoices`
- `invoice_items`
- `payments`
- `worker_logs`
- `invoice_periods`

## Environment Variables

See `.env.example` for all variables. Key ones:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=buildersoft
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
```
