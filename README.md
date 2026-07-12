# AssetFlow — Asset & Resource Management ERP

A centralized ERP platform for tracking, allocating, and maintaining physical assets and shared resources across organizations. Replaces spreadsheets and paper logs with structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its condition.

---

## 📋 Overview

**AssetFlow** is an ERP platform built for organizations (offices, schools, hospitals, factories, agencies) to manage physical assets throughout their lifecycle — from acquisition to disposal — with built-in resource booking, maintenance workflows, and audit capabilities.

### Key Features

| Feature | Description |
|---------|-------------|
| **Asset Registry** | Register assets with auto-generated tags (AF-0001), track condition, location, category, and allocation history |
| **Allocation & Transfer** | Assign assets to employees/departments with conflict prevention (no double-allocation) and transfer workflows |
| **Resource Booking** | Time-slot booking for shared bookable assets with overlap prevention |
| **Maintenance Management** | Request → Approve → Assign → Resolve workflow with asset status sync |
| **Asset Audit** | Structured verification cycles with auto-generated discrepancy reports |
| **Org Setup** | Departments, asset categories, employee directory with role-based access (Admin-only role elevation) |
| **Notifications & Activity Logs** | Real-time alerts for allocations, maintenance, bookings, transfers, overdue items, audit discrepancies |
| **Reports & Analytics** | Utilization rankings, maintenance frequency, lifecycle tracking, department allocation, booking heatmaps, CSV export |
| **Role-Based Dashboards** | Role-scoped KPIs: Employee (own items), Dept Head (dept), Admin/Asset Manager (org-wide) |

---

## 🏗 Architecture

```
AssetFlow-odoo/
├── client/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components (Layout, forms, tables, etc.)
│   │   ├── screens/        # Page-level screens (Dashboard, Assets, Allocation, etc.)
│   │   ├── lib/            # Auth, router, API client, utilities
│   │   └── hooks/          # Custom React hooks
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Express + Prisma + PostgreSQL backend
│   ├── src/
│   │   ├── config/         # Prisma, env, Cloudinary config
│   │   ├── middleware/     # Auth, error handling, upload, validation
│   │   └── modules/        # Feature modules (auth, org, asset, allocation, booking, maintenance, dashboard, audit, notification, reports)
│   ├── prisma/
│   │   ├── schema.prisma   # Canonical DB schema (PostgreSQL + Prisma)
│   │   ├── seed.js         # Admin bootstrap seed script
│   │   └── migrations/
│   ├── docs/               # Architecture & feature specs (overview.md, features.md, schema.md)
│   └── package.json
│
└── README.md               # This file
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express 5, Prisma ORM (v6) |
| **Database** | PostgreSQL |
| **Auth** | JWT (Bearer token), bcryptjs for password hashing |
| **Validation** | Zod v4 at every API boundary |
| **File Upload** | Multer + Cloudinary (asset photos, documents) |
| **Auth State** | Custom React Context + hash-based router |
| **Dev Tools** | ESLint, TypeScript, Nodemon, Vite |

---

## 🎭 Roles & Permissions

| Role | Core Permissions |
|------|------------------|
| **Admin** | Full org setup (departments, categories, employee directory), role promotion (Employee → Dept Head/Asset Manager), org-wide analytics, audit cycles |
| **Asset Manager** | Asset registry, allocation/transfer approval, maintenance approval, audit discrepancy resolution |
| **Department Head** | View dept assets, approve intra-dept allocations/transfers, book shared resources for dept |
| **Employee** | View own allocations, book resources, raise maintenance requests, initiate returns/transfers |

> **Critical Rule:** Signup **always** creates an `Employee`. Role elevation is **Admin-only** via Org Setup → Employee Directory. No self-elevation path exists.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Cloudinary account (for file uploads)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Assetflow-odoo

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

**Server** (`server/.env`):
```env
# Database
DB_URL="postgresql://user:pass@localhost:5432/assetflow?schema=public"

# Auth
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Cloudinary (for asset photos/documents)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**Client** (`client/.env`):
```env
VITE_API_BASE_URL="http://localhost:4000/api/v1"
```

### 3. Database Setup

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed admin user (run after every DB reset)
node prisma/seed.js
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5173
- **API Health**: http://localhost:4000/api/v1/health

---

## 📚 API Reference

### Base URL
```
http://localhost:4000/api/v1
```

### Authentication
All protected routes require `Authorization: Bearer <JWT>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register (always creates Employee) |
| `POST` | `/auth/login` | Login, returns JWT + user |
| `GET` | `/auth/me` | Get current user from token |

### Core Modules

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| **Org Setup** | `/` | `GET/POST /departments`, `GET/POST /categories`, `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status` |
| **Assets** | `/` | `POST /assets`, `GET /assets`, `GET /assets/:id`, `PUT /assets/:id` |
| **Allocation** | `/` | `POST /allocations`, `POST /allocations/:id/return`, `GET /allocations`, `POST /transfer-requests`, `PATCH /transfer-requests/:id/approve\|reject` |
| **Booking** | `/` | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/reschedule` |
| **Maintenance** | `/` | `POST /maintenance-requests`, `PATCH /maintenance-requests/:id/approve\|reject\|assign-technician\|start\|resolve` |
| **Audit** | `/` | `POST /audit-cycles`, `PATCH /audit-cycles/:id/start`, `PATCH /audit-items/:id`, `GET /audit-cycles/:id/discrepancies`, `PATCH /audit-cycles/:id/close` |
| **Notifications** | `/` | `GET /notifications`, `PATCH /notifications/:id/read` |
| **Reports** | `/` | `GET /reports/utilization`, `GET /reports/maintenance-frequency`, `GET /reports/upcoming-lifecycle`, `GET /reports/department-allocation`, `GET /reports/booking-heatmap`, `GET /reports/export` |
| **Dashboard** | `/` | `GET /dashboard` (role-scoped) |

### Response Envelope
```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" } }
```

### Critical Business Rules (enforced at API layer)

1. **Allocation Conflict** — Asset can only have one active allocation. Attempting to allocate an already-allocated asset returns `409 ASSET_ALREADY_ALLOCATED` with current holder info.
2. **Booking Overlap** — No two bookings on the same bookable asset can overlap (`newStart < existingEnd && newEnd > existingStart`). Returns `409 BOOKING_OVERLAP`.

---

## 🗄 Database Schema (Prisma)

Key models (see `server/prisma/schema.prisma` for full schema):

- **User** — id, name, email, passwordHash, role (Employee/DepartmentHead/AssetManager/Admin), departmentId, status
- **Department** — id, name, headUserId, parentDepartmentId, status
- **Category** — id, name, customFields (JSON)
- **Asset** — id, assetTag (AF-0001), name, categoryId, serialNumber, acquisitionDate, acquisitionCost, condition, status, location, photoUrl, documentUrls, isBookable, departmentId
- **Allocation** — id, assetId, holderUserId, holderDepartmentId, expectedReturnDate, actualReturnDate, status, returnConditionNotes
- **TransferRequest** — id, assetId, requestedById, requestedToUserId, requestedToDepartmentId, status
- **Booking** — id, assetId, userId, departmentId, startTime, endTime, status
- **MaintenanceRequest** — id, assetId, requestedById, issueDescription, priority, status, technicianName, resolutionNotes, photoUrl
- **AuditCycle** — id, scopeDepartmentId, scopeLocation, startDate, endDate, status
- **AuditItem** — id, auditCycleId, assetId, assignedAuditorId, result (Pending/Verified/Missing/Damaged), notes
- **Notification** — id, userId, type, title, message, isRead, relatedEntityType, relatedEntityId
- **ActivityLog** — id, userId, action, entityType, entityId, metadata

---

## 🎨 Frontend Structure

### Routes (Hash-based)
| Route | Screen | Roles |
|-------|--------|-------|
| `#/login` | LoginScreen | All |
| `#/dashboard` | DashboardScreen | All (role-scoped) |
| `#/org-setup` | OrgSetupScreen | Admin |
| `#/assets` | AssetsScreen | All |
| `#/asset-detail?id=` | AssetDetailScreen | All |
| `#/allocation` | AllocationScreen | AssetManager, DeptHead, Employee |
| `#/booking` | BookingScreen | Employee, DeptHead |
| `#/maintenance` | MaintenanceScreen | All |
| `#/audit` | AuditScreen | Admin |
| `#/reports` | ReportsScreen | Admin, AssetManager, DeptHead |
| `#/notifications` | NotificationsScreen | All |

### Role-Based Route Access
```typescript
const allowedRoutes = {
  Admin: ['dashboard', 'org-setup', 'audit', 'reports', 'notifications'],
  AssetManager: ['dashboard', 'assets', 'asset-detail', 'allocation', 'maintenance', 'audit', 'notifications'],
  DepartmentHead: ['dashboard', 'assets', 'asset-detail', 'allocation', 'booking', 'notifications'],
  Employee: ['dashboard', 'assets', 'asset-detail', 'allocation', 'booking', 'maintenance', 'notifications'],
};
```

---

## 🔧 Development

### Server Commands
```bash
cd server
npm run dev      # Start with nodemon
npm run start    # Production start
npx prisma studio  # DB GUI
npx prisma generate  # Regenerate client after schema changes
npx prisma migrate dev --name <name>  # Create migration
```

### Client Commands
```bash
cd client
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint
npm run typecheck  # TypeScript check
```

### Database Commands
```bash
cd server
npx prisma migrate reset    # Reset DB & re-run migrations
npx prisma db seed          # Run seed.js (creates admin user)
```

---

## 📁 Project Documentation

| File | Description |
|------|-------------|
| `server/docs/overview.md` | Architecture, conventions, roles, build order |
| `server/docs/features.md` | Complete API spec with all endpoints, rules, side effects |
| `server/docs/schema.md` | Canonical DB schema reference |

---

## 🔐 Security Notes

- **Passwords**: Bcrypt hashed (cost factor 12)
- **JWT**: HS256, 7-day expiry, payload: `{ userId, role, departmentId }`
- **Auth Middleware Order**: `authenticate` → `authorize(roles[])`
- **Role Elevation**: Only via `PATCH /api/users/:id/role` with `Admin` role
- **Admin Bootstrap**: Run `prisma/seed.js` directly — no API endpoint exists

---

## 📦 Build for Production

```bash
# Build client
cd client && npm run build

# Server runs compiled client from dist/ or serve separately
cd server && npm run start
```

---

## 🤝 Contributing

1. Follow the build order in `server/docs/overview.md` (Must-ship → Should-ship → Cut-first)
2. All API changes must follow conventions in `overview.md`
3. Schema changes require updating `schema.prisma` + running migration
4. Zod validation required at every API boundary
5. Role checks enforced in middleware, not just UI

---

## 📄 License

ISC License — see `server/package.json`

---

## 📞 Support

For issues, check:
- `server/docs/overview.md` — Architecture decisions
- `server/docs/features.md` — Endpoint contracts & business rules
- `server/docs/schema.md` — Database schema