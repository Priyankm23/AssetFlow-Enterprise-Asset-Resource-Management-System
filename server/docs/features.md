# AssetFlow — Features (all endpoints reference entities/enums defined in schema.md)

Format per feature: Purpose → Actors → Endpoints (method, path, request, response, status) → Business Rules → Side Effects.
All requests/responses use the global envelope and conventions from overview.md. Do not repeat schema field definitions here — they are pulled from schema.md by reference.

---

# 1. Auth

**Purpose:** Authenticate users; signup always creates an Employee, never a self-elevated role.
**Actors:** Public (signup/login), all authenticated users (session validation).

### POST /api/auth/signup

Request: `{ name, email, password }`
Response `201`: `{ user: {id, name, email, role: "Employee", departmentId: null, status}, token }`
Rules: `role` is always hardcoded server-side to `Employee`, ignore any `role` field if sent by client. `email` unique. Hash password before storing.

### POST /api/auth/login

Request: `{ email, password }`
Response `200`: `{ user: {id, name, email, role, departmentId, status}, token }`
Rules: reject if `status = Inactive`. Return `401` on bad credentials (generic message, don't reveal which field was wrong).

### GET /api/auth/me

Auth required. Response `200`: current user object (from JWT `userId`).

### POST /api/auth/forgot-password _(should-ship, skip if time-constrained)_

Request: `{ email }` → Response `200`: generic success message regardless of whether email exists.

---

# 2. Org Setup (Admin only, 3 tabs)

**Purpose:** Maintain master data everything else depends on.
**Actors:** Admin only for all writes. Any authenticated user can read departments/categories (needed for dropdowns elsewhere).

### Tab A — Departments

- `GET /api/departments` — list all, response includes `headUserId`, `parentDepartmentId`
- `POST /api/departments` — Request: `{ name, headUserId?, parentDepartmentId?, status }`
- `PUT /api/departments/:id` — same shape, partial update allowed
- `PATCH /api/departments/:id/deactivate` — sets `status: Inactive`

Rule: `headUserId`, if provided, must reference a User with `role = DepartmentHead`.

### Tab B — Asset Categories

- `GET /api/categories` — list all
- `POST /api/categories` — Request: `{ name, customFields? }`
- `PUT /api/categories/:id` — same shape

### Tab C — Employee Directory

- `GET /api/users` — list all (Admin only), supports `?department=&role=&status=` filters
- `PATCH /api/users/:id/role` — Request: `{ role: "DepartmentHead" | "AssetManager" }` — **the only endpoint in the system that changes a user's role**
- `PATCH /api/users/:id/status` — Request: `{ status: "Active" | "Inactive" }`

Rule: `PATCH /api/users/:id/role` must be Admin-only, enforced via `authorize(['Admin'])` middleware — this is the security-critical endpoint of the whole app, test it explicitly.

---

# 3. Asset Registry

**Purpose:** Register and search/track assets centrally.
**Actors:** Asset Manager (register), all authenticated users (search/view).

### POST /api/assets

Request: `{ name, categoryId, serialNumber?, acquisitionDate?, acquisitionCost?, condition, location?, photoUrl?, documentUrls?, isBookable }`
Response `201`: full Asset object including auto-generated `assetTag` (format `AF-0001`, increment sequentially).
Rule: `status` always defaults to `Available` on creation, not client-settable.

### GET /api/assets

Query params: `?search=&category=&status=&department=&location=` — search matches assetTag, serialNumber, or name.
Response: paginated list of Assets.

### GET /api/assets/:id

Response: Asset + `currentHolder` (resolved from latest Active Allocation, if any) + `allocationHistory` (list) + `maintenanceHistory` (list).

### PUT /api/assets/:id

Request: any registrable field except `assetTag`, `status` (status changes only via allocation/maintenance/audit side effects, never directly).

---

# 4. Allocation & Transfer

**Purpose:** Manage who holds what, with the double-allocation conflict rule enforced.
**Actors:** Asset Manager (allocate), Department Head (approve within dept), Employee (initiate return/transfer).

### POST /api/allocations

Request: `{ assetId, holderUserId? , holderDepartmentId?, expectedReturnDate? }` — exactly one of `holderUserId`/`holderDepartmentId` required.
Response `201`: Allocation object. Asset `status` → `Allocated`.
**Conflict rule (critical):** if Asset already has an Allocation with `status = Active`, reject with `409`:

```json
{ "success": false, "error": { "code": "ASSET_ALREADY_ALLOCATED", "message": "Currently held by <name>", "currentHolder": {...} } }
```

Client uses this to offer the Transfer Request flow instead.

### POST /api/allocations/:id/return

Request: `{ returnConditionNotes }`
Response `200`: Allocation `status → Returned`, `actualReturnDate` set. Asset `status → Available`.

### GET /api/allocations?assetId=&overdue=true

Supports overdue filter: `status = Active AND expectedReturnDate < now()` — feeds Dashboard KPI + Notifications.

### POST /api/transfer-requests

Request: `{ assetId, requestedToUserId?, requestedToDepartmentId? }`
Response `201`: TransferRequest, `status: Requested`.

### PATCH /api/transfer-requests/:id/approve

Auth: Asset Manager or Department Head (of the relevant department).
Response `200`: `status → Approved`, then automatically: closes old Allocation (`Returned`), creates new Allocation (`Active`) for the new holder, TransferRequest `status → ReAllocated`.

### PATCH /api/transfer-requests/:id/reject

Response `200`: `status → Rejected`.

---

# 5. Resource Booking

**Purpose:** Time-slot booking of bookable Assets (`isBookable = true`) with no overlaps.
**Actors:** Employee, Department Head (on behalf of dept).

### POST /api/bookings

Request: `{ assetId, startTime, endTime, departmentId? }`
Response `201`: Booking, `status: Upcoming`.
**Overlap rule (critical):** reject with `409` if any existing Booking on the same `assetId` (status `Upcoming` or `Ongoing`) satisfies `newStart < existingEnd AND newEnd > existingStart`:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAP",
    "message": "Conflicts with existing booking 9:00-10:00"
  }
}
```

Also reject if `Asset.isBookable = false` (`400`).

### GET /api/bookings?assetId=&from=&to=

Response: bookings in range, used for calendar view.

### PATCH /api/bookings/:id/cancel

Response `200`: `status → Cancelled`.

### PATCH /api/bookings/:id/reschedule

Request: `{ startTime, endTime }` — re-runs overlap check.

Status transition note: `Upcoming → Ongoing` and `Ongoing → Completed` can be computed on read (compare `now()` to start/end) rather than requiring a cron job, if time-constrained.

---

# 6. Maintenance Management

**Purpose:** Route repairs through approval before work starts.
**Actors:** Any user (raise request), Asset Manager (approve/reject, assign technician).

### POST /api/maintenance-requests

Request: `{ assetId, issueDescription, priority, photoUrl? }`
Response `201`: `status: Pending`.

### PATCH /api/maintenance-requests/:id/approve

Response `200`: `status → Approved`. **Side effect: Asset `status → UnderMaintenance`.**

### PATCH /api/maintenance-requests/:id/reject

Request: `{ reason? }` → `status → Rejected`. No asset status change.

### PATCH /api/maintenance-requests/:id/assign-technician

Request: `{ technicianName }` → `status → TechnicianAssigned`.

### PATCH /api/maintenance-requests/:id/start

`status → InProgress`.

### PATCH /api/maintenance-requests/:id/resolve

Request: `{ resolutionNotes }` → `status → Resolved`. **Side effect: Asset `status → Available`.**

### GET /api/maintenance-requests?assetId=&status=

List/filter, feeds per-asset maintenance history (Screen 4).

---

# 7. Asset Audit _(should-ship)_

**Purpose:** Structured verification cycles with auto-generated discrepancy reports.
**Actors:** Admin (create cycle, assign auditors), assigned Auditors (mark items).

### POST /api/audit-cycles

Request: `{ scopeDepartmentId?, scopeLocation?, startDate, endDate, auditorUserIds: [] }`
Response `201`: AuditCycle `status: Planned` + AuditItem rows auto-created for every Asset matching scope (status `Pending`).

### PATCH /api/audit-cycles/:id/start

`status → InProgress`.

### PATCH /api/audit-items/:id

Request: `{ result: "Verified" | "Missing" | "Damaged", notes? }`
Auth: must be an assigned auditor on the parent cycle.

### GET /api/audit-cycles/:id/discrepancies

Response: all AuditItems where `result IN (Missing, Damaged)` — the auto-generated discrepancy report.

### PATCH /api/audit-cycles/:id/close

Response `200`: `status → Closed`. **Side effect: for every AuditItem with `result = Missing`, set related Asset `status → Lost`.**

---

# 8. Notifications & Activity Logs _(should-ship)_

**Purpose:** Keep every role informed without digging.
**Actors:** All authenticated users (read own notifications), system (write, triggered by other features' side effects).

### GET /api/notifications?unreadOnly=true

Response: list of Notification for `req.user.id`, most recent first.

### PATCH /api/notifications/:id/read

`isRead → true`.

### GET /api/activity-logs?entityType=&entityId=&userId=

Admin/Manager only. Read-only audit trail.

**Trigger table (write internally, not client-facing endpoints):**
| Event | Notification type | Recipient |
|---|---|---|
| Allocation created | AssetAssigned | new holder |
| Maintenance approved/rejected | MaintenanceApproved/Rejected | requester |
| Booking created/cancelled | BookingConfirmed/Cancelled | booker |
| 1hr before booking start | BookingReminder | booker |
| Transfer approved | TransferApproved | new holder |
| Allocation/Booking overdue | OverdueReturn | holder/booker |
| AuditItem marked Missing/Damaged | AuditDiscrepancy | Admin + relevant Asset Manager |

Implementation note: create a single `createNotification()` helper called from inside the relevant feature's side-effect logic, rather than a separate polling/cron system — simplest for 8-hour scope. `ActivityLog` similarly: a `logActivity()` helper called wherever a mutating action succeeds.

---

# 9. Reports & Analytics _(cut first if behind schedule)_

**Purpose:** Managerial insight, all read-only aggregation endpoints.
**Actors:** Admin, Asset Manager, Department Head (own department only).

### GET /api/reports/utilization

Response: assets ranked by allocation/booking frequency — most-used vs idle.

### GET /api/reports/maintenance-frequency

Response: maintenance request count grouped by asset/category.

### GET /api/reports/upcoming-lifecycle

Response: assets nearing retirement or due for maintenance (define "due" heuristically, e.g. no maintenance in last N months, if no explicit schedule field exists).

### GET /api/reports/department-allocation

Response: allocation counts grouped by department.

### GET /api/reports/booking-heatmap

Response: booking counts bucketed by hour/day-of-week.

### GET /api/reports/export?type=&format=csv

Exportable version of any of the above. If time-constrained, CSV only, skip PDF export.

---

# Dashboard (not a separate feature — composed from the above)

`GET /api/dashboard` — Admin/Manager/DeptHead/Employee all get a scoped version of the same shape:

```json
{
  "kpis": {
    "assetsAvailable": 0, "assetsAllocated": 0, "maintenanceToday": 0,
    "activeBookings": 0, "pendingTransfers": 0, "upcomingReturns": 0
  },
  "overdueReturns": [...],
  "upcomingReturns": [...]
}
```

Scope by role: Employee sees only their own allocations/bookings; DeptHead sees their department; Admin/AssetManager see org-wide.
