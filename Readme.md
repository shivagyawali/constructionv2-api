# Buildersoft CMS — Multi-Tenant API v3.0

A fully multi-tenant construction management backend. Each company gets complete data isolation — their own projects, clients, workers, invoices, pay periods, and role permissions.

## Architecture Overview

```
Platform (SuperAdmin)
└── Company A (Admin + Users)
│   ├── Clients
│   ├── Projects → Tasks, WorkerLogs
│   ├── Workers → InvoicePeriods
│   └── Invoices → Payments
└── Company B (Admin + Users)
    └── ... completely isolated data
```

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Copy env file
cp .env.example .env
# Edit .env with your MySQL credentials and secrets

# 3. Create database
mysql -u root -p -e "CREATE DATABASE buildersoft_multitenant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Start (auto-syncs schema in dev)
npm run dev

# 5. Seed superadmin + demo company
npm run seed
```

## Default Credentials (after seed)

| Role          | Email                       | Password        |
|---------------|-----------------------------|-----------------|
| SuperAdmin    | superadmin@buildersoft.io   | SuperAdmin@123  |
| Company Admin | admin@ironframe.com         | Admin@123456    |
| Manager       | manager@ironframe.com       | Manager@123     |
| Supervisor    | supervisor@ironframe.com    | Supervisor@123  |
| Worker        | worker@ironframe.com        | Worker@123      |

## Multi-Tenancy Design

### Tenant Isolation
Every resource (Client, Project, Worker, Invoice, etc.) has a `companyId` column. All queries are automatically scoped to the authenticated user's `companyId`. Cross-company access returns 403.

### Roles
- **superadmin** — Platform-wide. Sees all companies, all data. No companyId.
- **admin** — Full access within their company.
- **manager** — Configurable via role permissions.
- **supervisor** — Configurable via role permissions.
- **worker** — Configurable via role permissions.
- **contractor** — Minimum access.

### Role Permissions
Each company has its own role permission table. Admins can customize which routes each role can access. SuperAdmin can set global defaults.

## API Endpoints

### Auth
```
POST   /api/auth/register          Body: { firstName, lastName, email, password, companyId? }
POST   /api/auth/login             Body: { email, password }
POST   /api/auth/refresh           Body: { refreshToken }
POST   /api/auth/logout
GET    /api/auth/profile
PATCH  /api/auth/profile
POST   /api/auth/change-password
```

### Companies (SuperAdmin + own Company Admin)
```
GET    /api/companies              SuperAdmin: all companies
POST   /api/companies              SuperAdmin: create company + owner
GET    /api/companies/:id          SuperAdmin or own company admin
PATCH  /api/companies/:id
POST   /api/companies/:id/toggle-status   SuperAdmin only
DELETE /api/companies/:id          SuperAdmin only

GET    /api/companies/:id/users          List users in company
POST   /api/companies/:id/users          Create user in company
GET    /api/companies/:id/role-permissions
PUT    /api/companies/:id/role-permissions
```

### SuperAdmin Panel
```
GET    /api/superadmin/overview           Platform-wide stats
GET    /api/superadmin/users             All users (with companyId filter)
POST   /api/superadmin/users             Create superadmin
PATCH  /api/superadmin/users/:id
POST   /api/superadmin/users/:id/reset-password
GET    /api/superadmin/report/company    Revenue + stats per company
```

### Dashboard (company-scoped)
```
GET    /api/dashboard/overview
GET    /api/dashboard/labor
```

### Clients / Projects / Workers / Invoices / Tasks / Worker Logs / Invoice Periods
All standard CRUD — identical to v2 but scoped to authenticated user's company.

## Plan Limits

| Plan       | Max Users | Max Projects | Max Workers |
|------------|-----------|--------------|-------------|
| free       | 5         | 10           | 20          |
| starter    | 15        | 30           | 50          |
| pro        | 50        | 100          | 200         |
| enterprise | unlimited | unlimited    | unlimited   |

Limits enforced at creation time. Returns 403 with upgrade message.

## SuperAdmin: Managing a Company

```bash
# Create a company with an owner
POST /api/companies
{
  "name": "BuildCo Ltd",
  "email": "info@buildco.com",
  "plan": "pro",
  "maxUsers": 25,
  "ownerFirstName": "John",
  "ownerLastName": "Smith",
  "ownerEmail": "john@buildco.com",
  "ownerPassword": "SecurePass123"
}

# View platform analytics
GET /api/superadmin/overview

# Suspend a company
POST /api/companies/:id/toggle-status
```

## Company Admin: Managing Users

```bash
# Add a user to your company
POST /api/companies/:id/users
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@mycompany.com",
  "password": "Pass@12345",
  "role": "supervisor"
}

# Customize role permissions
PUT /api/companies/:id/role-permissions
{
  "permissions": {
    "manager":    ["/dashboard", "/clients", "/projects", "/tasks", "/workers", "/invoices"],
    "supervisor": ["/dashboard", "/projects", "/tasks"],
    "worker":     ["/dashboard", "/tasks"]
  }
}
```
