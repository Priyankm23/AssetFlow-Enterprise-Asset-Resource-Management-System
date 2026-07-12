# AssetFlow — Schema (Canonical, Single Source of Truth)

This file is authoritative. Every feature doc references entities defined here rather than redefining them. Do not modify field names/types while implementing a feature — flag back to the PRD owner instead.

Conventions: all primary keys are UUID strings (`id`). All timestamps are ISO 8601. All foreign keys named `<entity>Id`. Enums are implemented as Postgres enums (or string-constrained fields if using raw SQL without native enum support — stay consistent, pick one approach project-wide).

---

## User

Represents every person in the system — Employee, Department Head, Asset Manager, or Admin (role field distinguishes).

| Field        | Type                                                        | Notes                                     |
| ------------ | ----------------------------------------------------------- | ----------------------------------------- |
| id           | uuid                                                        | PK                                        |
| name         | string                                                      | required                                  |
| email        | string                                                      | unique, required                          |
| passwordHash | string                                                      | required, never returned in API responses |
| role         | enum: `Employee`, `DepartmentHead`, `AssetManager`, `Admin` | default `Employee` on signup              |
| departmentId | uuid, nullable                                              | FK → Department                           |
| status       | enum: `Active`, `Inactive`                                  | default `Active`                          |
| createdAt    | timestamp                                                   |                                           |
| updatedAt    | timestamp                                                   |                                           |

---

## Department

| Field              | Type                       | Notes                                             |
| ------------------ | -------------------------- | ------------------------------------------------- |
| id                 | uuid                       | PK                                                |
| name               | string                     | required                                          |
| headUserId         | uuid, nullable             | FK → User (must have role `DepartmentHead`)       |
| parentDepartmentId | uuid, nullable             | FK → Department (self-referential, for hierarchy) |
| status             | enum: `Active`, `Inactive` | default `Active`                                  |
| createdAt          | timestamp                  |                                                   |
| updatedAt          | timestamp                  |                                                   |

---

## AssetCategory

| Field        | Type            | Notes                                                                    |
| ------------ | --------------- | ------------------------------------------------------------------------ |
| id           | uuid            | PK                                                                       |
| name         | string          | required, e.g. "Electronics", "Furniture", "Vehicles"                    |
| customFields | jsonb, nullable | optional category-specific fields, e.g. `{ "warrantyPeriodMonths": 24 }` |
| createdAt    | timestamp       |                                                                          |
| updatedAt    | timestamp       |                                                                          |

---

## Asset

| Field           | Type                                                                                          | Notes                                              |
| --------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| id              | uuid                                                                                          | PK                                                 |
| assetTag        | string                                                                                        | unique, auto-generated, e.g. `AF-0001`             |
| name            | string                                                                                        | required                                           |
| categoryId      | uuid                                                                                          | FK → AssetCategory                                 |
| serialNumber    | string, nullable                                                                              |                                                    |
| acquisitionDate | date, nullable                                                                                |                                                    |
| acquisitionCost | decimal, nullable                                                                             | ranking/reporting only, never linked to accounting |
| condition       | enum: `New`, `Good`, `Fair`, `Poor`, `Damaged`                                                | required                                           |
| location        | string, nullable                                                                              | free text or structured — keep simple for MVP      |
| photoUrl        | string, nullable                                                                              |                                                    |
| documentUrls    | jsonb, nullable                                                                               | array of file URLs                                 |
| isBookable      | boolean                                                                                       | default `false` — the "shared/bookable" flag       |
| status          | enum: `Available`, `Allocated`, `Reserved`, `UnderMaintenance`, `Lost`, `Retired`, `Disposed` | default `Available`                                |
| createdAt       | timestamp                                                                                     |                                                    |
| updatedAt       | timestamp                                                                                     |                                                    |

**Valid status transitions** (enforced in application logic, not just DB):

```
Available → Allocated        (via Allocation)
Available → Reserved         (via Booking, if isBookable)
Available ⇄ UnderMaintenance (via Maintenance approval/resolution)
Allocated → Available        (via Return)
Available/Allocated → Lost   (via Audit)
Available → Retired → Disposed
```

---

## Allocation

Tracks current + historical holder of an asset. One row per allocation event; current holder = latest row with `status = Active`.

| Field                | Type                       | Notes                                                                                                      |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| id                   | uuid                       | PK                                                                                                         |
| assetId              | uuid                       | FK → Asset                                                                                                 |
| holderUserId         | uuid, nullable             | FK → User — set if allocated to an individual                                                              |
| holderDepartmentId   | uuid, nullable             | FK → Department — set if allocated to a department (exactly one of holderUserId/holderDepartmentId is set) |
| allocatedAt          | timestamp                  |                                                                                                            |
| expectedReturnDate   | date, nullable             |                                                                                                            |
| actualReturnDate     | date, nullable             | null until returned                                                                                        |
| returnConditionNotes | string, nullable           | filled on return                                                                                           |
| status               | enum: `Active`, `Returned` |                                                                                                            |
| createdAt            | timestamp                  |                                                                                                            |
| updatedAt            | timestamp                  |                                                                                                            |

**Conflict rule:** An Asset can have at most one Allocation with `status = Active` at any time. Enforce via application-level check before insert (and ideally a partial unique index: unique on `assetId` where `status = 'Active'`).

---

## TransferRequest

| Field                   | Type                                                     | Notes                                                        |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| id                      | uuid                                                     | PK                                                           |
| assetId                 | uuid                                                     | FK → Asset                                                   |
| currentAllocationId     | uuid                                                     | FK → Allocation (the allocation being transferred away from) |
| requestedByUserId       | uuid                                                     | FK → User                                                    |
| requestedToUserId       | uuid, nullable                                           | FK → User — new intended holder (individual)                 |
| requestedToDepartmentId | uuid, nullable                                           | FK → Department — new intended holder (department)           |
| status                  | enum: `Requested`, `Approved`, `Rejected`, `ReAllocated` |                                                              |
| approvedByUserId        | uuid, nullable                                           | FK → User (AssetManager or DepartmentHead)                   |
| createdAt               | timestamp                                                |                                                              |
| updatedAt               | timestamp                                                |                                                              |

---

## Resource

A shared, bookable resource (room, vehicle, equipment). Note: this may overlap conceptually with bookable Assets (`Asset.isBookable = true`) — for MVP, treat any Asset with `isBookable = true` as the bookable Resource; a separate `Resource` table is only needed if the hackathon requires bookable things that aren't tracked Assets. **Decide this once before building Booking — default assumption below is Resource = Asset (isBookable = true), no separate table.**

---

## Booking

| Field          | Type                                                  | Notes                                                     |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| id             | uuid                                                  | PK                                                        |
| assetId        | uuid                                                  | FK → Asset (must have `isBookable = true`)                |
| bookedByUserId | uuid                                                  | FK → User                                                 |
| departmentId   | uuid, nullable                                        | FK → Department — set if booked on behalf of a department |
| startTime      | timestamp                                             | required                                                  |
| endTime        | timestamp                                             | required                                                  |
| status         | enum: `Upcoming`, `Ongoing`, `Completed`, `Cancelled` |                                                           |
| createdAt      | timestamp                                             |                                                           |
| updatedAt      | timestamp                                             |                                                           |

**Overlap rule:** reject if any existing Booking for the same `assetId` (status `Upcoming` or `Ongoing`) satisfies `newStart < existingEnd AND newEnd > existingStart`.

---

## MaintenanceRequest

| Field            | Type                                                                                    | Notes                                                   |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| id               | uuid                                                                                    | PK                                                      |
| assetId          | uuid                                                                                    | FK → Asset                                              |
| raisedByUserId   | uuid                                                                                    | FK → User                                               |
| issueDescription | string                                                                                  | required                                                |
| priority         | enum: `Low`, `Medium`, `High`, `Urgent`                                                 |                                                         |
| photoUrl         | string, nullable                                                                        |                                                         |
| status           | enum: `Pending`, `Approved`, `Rejected`, `TechnicianAssigned`, `InProgress`, `Resolved` |                                                         |
| approvedByUserId | uuid, nullable                                                                          | FK → User (AssetManager)                                |
| technicianName   | string, nullable                                                                        | free text for MVP, no separate technician entity needed |
| resolutionNotes  | string, nullable                                                                        |                                                         |
| createdAt        | timestamp                                                                               |                                                         |
| updatedAt        | timestamp                                                                               |                                                         |

**Side effects:** Asset status → `UnderMaintenance` on `Approved`; Asset status → `Available` on `Resolved`.

---

## AuditCycle

| Field             | Type                                    | Notes                                 |
| ----------------- | --------------------------------------- | ------------------------------------- |
| id                | uuid                                    | PK                                    |
| scopeDepartmentId | uuid, nullable                          | FK → Department — null means org-wide |
| scopeLocation     | string, nullable                        |                                       |
| startDate         | date                                    |                                       |
| endDate           | date                                    |                                       |
| status            | enum: `Planned`, `InProgress`, `Closed` |                                       |
| createdByUserId   | uuid                                    | FK → User (Admin)                     |
| createdAt         | timestamp                               |                                       |
| updatedAt         | timestamp                               |                                       |

## AuditCycleAuditor

Join table — an audit cycle can have multiple auditors.

| Field         | Type | Notes           |
| ------------- | ---- | --------------- |
| id            | uuid | PK              |
| auditCycleId  | uuid | FK → AuditCycle |
| auditorUserId | uuid | FK → User       |

## AuditItem

One row per asset checked within an audit cycle.

| Field           | Type                                              | Notes             |
| --------------- | ------------------------------------------------- | ----------------- |
| id              | uuid                                              | PK                |
| auditCycleId    | uuid                                              | FK → AuditCycle   |
| assetId         | uuid                                              | FK → Asset        |
| checkedByUserId | uuid, nullable                                    | FK → User         |
| result          | enum: `Pending`, `Verified`, `Missing`, `Damaged` | default `Pending` |
| notes           | string, nullable                                  |                   |
| createdAt       | timestamp                                         |                   |
| updatedAt       | timestamp                                         |                   |

**Close-cycle side effect:** on `AuditCycle.status → Closed`, for every AuditItem with `result = Missing`, set the related Asset's `status = Lost`.

---

## Notification

| Field           | Type                                                                                                                                                                                    | Notes                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id              | uuid                                                                                                                                                                                    | PK                                                                                                                                                                  |
| userId          | uuid                                                                                                                                                                                    | FK → User (recipient)                                                                                                                                               |
| type            | enum: `AssetAssigned`, `MaintenanceApproved`, `MaintenanceRejected`, `BookingConfirmed`, `BookingCancelled`, `BookingReminder`, `TransferApproved`, `OverdueReturn`, `AuditDiscrepancy` |                                                                                                                                                                     |
| message         | string                                                                                                                                                                                  |                                                                                                                                                                     |
| relatedEntityId | uuid, nullable                                                                                                                                                                          | polymorphic reference (Asset/Booking/MaintenanceRequest/etc — store type in a separate field if needed, or keep simple for MVP and just embed context in `message`) |
| isRead          | boolean                                                                                                                                                                                 | default `false`                                                                                                                                                     |
| createdAt       | timestamp                                                                                                                                                                               |                                                                                                                                                                     |

---

## ActivityLog

| Field       | Type            | Notes                                              |
| ----------- | --------------- | -------------------------------------------------- |
| id          | uuid            | PK                                                 |
| actorUserId | uuid            | FK → User                                          |
| action      | string          | e.g. `"asset.allocated"`, `"maintenance.approved"` |
| entityType  | string          | e.g. `"Asset"`, `"Booking"`                        |
| entityId    | uuid            |                                                    |
| metadata    | jsonb, nullable | before/after values or extra context               |
| createdAt   | timestamp       |                                                    |

---

## Entity Relationship Summary

```
Department 1─* User (via departmentId)
Department 1─1 User (via headUserId, DepartmentHead)
Department *─1 Department (parentDepartmentId, self-ref hierarchy)

AssetCategory 1─* Asset

Asset 1─* Allocation
Asset 1─* TransferRequest
Asset 1─* Booking
Asset 1─* MaintenanceRequest
Asset 1─* AuditItem

User 1─* Allocation (as holder)
User 1─* Booking (as booker)
User 1─* MaintenanceRequest (as raiser)
User 1─* Notification
User 1─* ActivityLog (as actor)

AuditCycle 1─* AuditItem
AuditCycle *─* User (via AuditCycleAuditor)
```

## Open Decisions (resolve before building — flag back if unsure)

1. **Resource vs Asset for booking:** default assumption is bookable Resources ARE Assets with `isBookable = true`. If the hackathon expects Resources as a fully separate entity type unrelated to trackable Assets, this needs a new `Resource` table — confirm before building Booking feature.
2. **Notification `relatedEntityId` polymorphism:** kept loose for MVP speed. If time allows, consider a proper `relatedEntityType` field for cleaner querying.
3. **Enum implementation:** decide Postgres native enums vs string + check constraint once, apply consistently — don't mix across tables.
