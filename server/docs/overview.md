# AssetFlow — Overview

## Vision

AssetFlow is a centralized ERP platform for tracking, allocating, and maintaining physical assets and shared resources across any organization (offices, schools, hospitals, factories, agencies). It replaces spreadsheets/paper logs with structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its condition.

## Non-Goals (explicitly out of scope)

- No purchasing, invoicing, or accounting workflows
- Acquisition Cost is stored for ranking/reporting only — never linked to accounting
- No self-service role elevation — roles are assigned by Admin only, never at signup

## Tech Stack

- **Frontend:** React (generated via Stitch → Lovable/Bolt)
- **Backend:** Express (Node.js)
- **DB:** PostgreSQL (Prisma or raw SQL — decide once, stay consistent across all features)
- **Auth:** JWT (see Auth Conventions below)
- **Validation:** Zod at every API boundary

## Roles & Permissions

| Role                | Core Permissions                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**           | Manages departments, asset categories, audit cycles, employee/role assignment (Org Setup). Views org-wide analytics. Only role that can promote Employees → Department Head / Asset Manager. |
| **Asset Manager**   | Registers and allocates assets. Approves transfers, maintenance requests, audit discrepancy resolution. Approves returns + condition check-in notes.                                         |
| **Department Head** | Views assets allocated to their department. Approves allocation/transfer requests within their department. Books shared resources on behalf of the department.                               |
| **Employee**        | Views assets allocated to them. Books shared resources. Raises maintenance requests. Initiates return/transfer requests.                                                                     |

**Critical rule:** Signup always creates an Employee account. No role selection at signup. Admin promotes users to Department Head / Asset Manager exclusively from the Employee Directory (Org Setup → Tab C). There is no other path to elevated roles — this must be enforced server-side, not just hidden in the UI.

## Global API Conventions

**Response envelope** (every endpoint, no exceptions):

```json
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "error": { "code": "STRING_CODE", "message": "human readable" } }
```

**HTTP status codes:**

- `200` success (GET/PUT/PATCH), `201` created (POST), `204` no content (DELETE)
- `400` validation error (zod failure) → include field-level errors in `error.details`
- `401` unauthenticated, `403` unauthorized (wrong role), `404` not found
- `409` conflict (double-allocation, booking overlap) — **use this specifically for the two conflict rules below**, not a generic 400

**Field naming:** camelCase everywhere — request bodies, response bodies, query params. No mixing with snake_case even if the DB uses snake_case columns; map at the API layer.

**Dates:** ISO 8601 strings (`"2026-07-15T09:00:00Z"`) in all requests/responses. Never epoch integers.

**IDs:** UUIDs (string) for all primary keys, except Asset Tag which is a separate human-readable field (see schema.md).

## Auth Conventions

- JWT issued on login, sent as `Authorization: Bearer <token>` header
- Payload contains: `userId`, `role`, `departmentId`
- Middleware order: `authenticate` (verifies JWT) → `authorize(roles[])` (checks role) → handler
- Password reset: standard forgot-password token flow, out of scope for MVP unless time allows (Should-ship tier)

**Admin bootstrap:** Since signup only ever creates an Employee (no role selection at signup, no in-app self-elevation), the very first Admin cannot come from the normal API flow. Bootstrap it via a one-time seed script (`seed.js`) that inserts/upserts a user directly with `role: 'Admin'` — this must run at the DB/seed level only, **never** as a reachable API endpoint (no `POST /admin/bootstrap` in the running app), or it reopens the self-elevation hole the role model is designed to prevent. Re-run the seed script after any DB reset so you always have known Admin credentials for testing/demo.

## Key Business Rules (cross-feature — full detail lives in each feature doc)

These are the two rules the whole problem statement is built around. Get these right first; everything else is CRUD around them.

1. **Allocation conflict rule:** An asset can only be allocated to one employee/department at a time. Attempting to allocate an already-allocated asset is blocked with `409`, returns who currently holds it, and the client should offer a Transfer Request instead.
2. **Booking overlap rule:** A shared resource cannot have two overlapping bookings. Overlap = `newStart < existingEnd AND newEnd > existingStart`. A booking starting exactly when another ends is valid (no overlap).

## Asset Lifecycle (state machine)

```
Available ⇄ Under Maintenance
Available → Allocated → Available (on return)
Available → Reserved (shared/bookable flag)
Available/Allocated → Lost (via audit)
Available → Retired → Disposed
```

Full transition triggers are documented per-feature (allocation, maintenance, audit).

## Build Order (priority-tiered for the 8-hour window)

**Must-ship — core loop, build in this order:**

1. Auth (login/signup)
2. Org Setup (departments, categories, employee directory)
3. Asset Registry (register + search/track)
4. Allocation & Transfer (the double-allocation conflict rule)
5. Resource Booking (the overlap rule)
6. Maintenance Management (approval workflow)

**Should-ship if time allows:** 7. Audit Cycles 8. Notifications & Activity Logs

**Cut first if behind schedule:** 9. Reports & Analytics — most detachable, nothing else depends on it

If you're behind schedule mid-hackathon, this ordering is the decision already made — don't re-litigate it live, just stop at whatever tier you've reached.

## Reference Docs

- `schema.md` — canonical DB schema, all entities/enums/relations (single source of truth, referenced by every feature doc)
- `features/*.md` — one per feature, contains endpoints + feature-specific business rules

**Instruction for the coding agent:** `schema.md` is the literal, authoritative DB schema. Do not rename fields, change types, add/remove columns, or "improve" the schema during implementation — if something in `schema.md` seems wrong or incomplete for the feature you're building, stop and flag it back rather than silently deviating. The same applies to business rules stated in the relevant `features/*.md` file: implement them as written, don't reinterpret.
