import type {
  AllocationRecord,
  Asset,
  AuditCycle,
  AuditItem,
  Booking,
  Category,
  Department,
  DashboardData,
  MaintenanceRequest,
  Notification,
  TransferRequest,
  User,
  UtilizationReport,
  MaintenanceFrequencyReport,
  LifecycleReport,
  DepartmentAllocationReport,
  BookingHeatmapReport,
  ActivityEntry,
} from './types';

// ---- Seed data ----
const users: User[] = [
  { id: 'u1', name: 'Priya Shah', email: 'priya@assetflow.io', role: 'DepartmentHead', departmentId: 'd1', departmentName: 'Engineering', status: 'active' },
  { id: 'u2', name: 'Marcus Chen', email: 'marcus@assetflow.io', role: 'AssetManager', departmentId: 'd2', departmentName: 'IT', status: 'active' },
  { id: 'u3', name: 'Elena Volkov', email: 'elena@assetflow.io', role: 'Admin', departmentId: 'd3', departmentName: 'Operations', status: 'active' },
  { id: 'u4', name: 'James Okafor', email: 'james@assetflow.io', role: 'Employee', departmentId: 'd1', departmentName: 'Engineering', status: 'active' },
  { id: 'u5', name: 'Sara Lindqvist', email: 'sara@assetflow.io', role: 'Employee', departmentId: 'd2', departmentName: 'IT', status: 'active' },
  { id: 'u6', name: 'Dev Patel', email: 'dev@assetflow.io', role: 'Employee', departmentId: 'd4', departmentName: 'Procurement', status: 'inactive' },
  { id: 'u7', name: 'Aisha Rahman', email: 'aisha@assetflow.io', role: 'DepartmentHead', departmentId: 'd4', departmentName: 'Procurement', status: 'active' },
  { id: 'u8', name: 'Tom Bridger', email: 'tom@assetflow.io', role: 'Employee', departmentId: 'd3', departmentName: 'Operations', status: 'active' },
];

const departments: Department[] = [
  { id: 'd1', name: 'Engineering', headUserId: 'u1', headUserName: 'Priya Shah', status: 'active' },
  { id: 'd2', name: 'IT', headUserId: 'u2', headUserName: 'Marcus Chen', parentDepartmentId: 'd1', parentDepartmentName: 'Engineering', status: 'active' },
  { id: 'd3', name: 'Operations', headUserId: 'u3', headUserName: 'Elena Volkov', status: 'active' },
  { id: 'd4', name: 'Procurement', headUserId: 'u7', headUserName: 'Aisha Rahman', parentDepartmentId: 'd3', parentDepartmentName: 'Operations', status: 'active' },
  { id: 'd5', name: 'Facilities', status: 'active' },
];

const categories: Category[] = [
  { id: 'c1', name: 'Laptops' },
  { id: 'c2', name: 'Monitors' },
  { id: 'c3', name: 'Vehicles' },
  { id: 'c4', name: 'Medical Equipment' },
  { id: 'c5', name: 'Meeting Rooms' },
  { id: 'c6', name: 'Power Tools' },
];

const assets: Asset[] = [
  { id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 5440', categoryId: 'c1', categoryName: 'Laptops', serialNumber: 'DL5440-22X91', acquisitionDate: '2023-03-15', acquisitionCost: 1450, condition: 'Good', status: 'Allocated', departmentId: 'd1', departmentName: 'Engineering', location: 'Floor 3 — Desk 12', isBookable: false, currentHolder: { userId: 'u1', userName: 'Priya Shah', departmentName: 'Engineering' } },
  { id: 'a2', tag: 'AF-0002', name: 'HP EliteDisplay 27', categoryId: 'c2', categoryName: 'Monitors', serialNumber: 'HP27-44820', condition: 'Good', status: 'Available', departmentId: 'd2', departmentName: 'IT', location: 'IT Storage Room', isBookable: false },
  { id: 'a3', tag: 'AF-0003', name: 'Toyota Hilux Fleet 03', categoryId: 'c3', categoryName: 'Vehicles', serialNumber: 'TH-2023-003', acquisitionDate: '2023-06-01', acquisitionCost: 42000, condition: 'Good', status: 'Allocated', departmentId: 'd3', departmentName: 'Operations', location: 'Loading Bay', isBookable: true, currentHolder: { userId: 'u8', userName: 'Tom Bridger', departmentName: 'Operations' } },
  { id: 'a4', tag: 'AF-0004', name: 'Ultrasound Probe X7', categoryId: 'c4', categoryName: 'Medical Equipment', serialNumber: 'USP-X7-0012', acquisitionDate: '2022-11-20', acquisitionCost: 8900, condition: 'Fair', status: 'Under Maintenance', departmentId: 'd3', departmentName: 'Operations', location: 'Clinic Room B', isBookable: false },
  { id: 'a5', tag: 'AF-0005', name: 'Conference Room Aurora', categoryId: 'c5', categoryName: 'Meeting Rooms', condition: 'New', status: 'Available', departmentId: 'd5', departmentName: 'Facilities', location: 'Floor 2 — West Wing', isBookable: true },
  { id: 'a6', tag: 'AF-0006', name: 'MacBook Pro 16"', categoryId: 'c1', categoryName: 'Laptops', serialNumber: 'MBP16-55210', acquisitionDate: '2024-01-10', acquisitionCost: 2800, condition: 'New', status: 'Available', departmentId: 'd2', departmentName: 'IT', location: 'IT Storage Room', isBookable: false },
  { id: 'a7', tag: 'AF-0007', name: 'Bosch Drill Set', categoryId: 'c6', categoryName: 'Power Tools', serialNumber: 'BD-SET-088', condition: 'Good', status: 'Available', departmentId: 'd5', departmentName: 'Facilities', location: 'Maintenance Closet', isBookable: true },
  { id: 'a8', tag: 'AF-0008', name: 'Dell PowerEdge R650', categoryId: 'c2', categoryName: 'Monitors', serialNumber: 'DPE-650-3340', acquisitionDate: '2023-09-05', acquisitionCost: 5200, condition: 'Good', status: 'Allocated', departmentId: 'd2', departmentName: 'IT', location: 'Server Room A', isBookable: false, currentHolder: { userId: 'u5', userName: 'Sara Lindqvist', departmentName: 'IT' } },
  { id: 'a9', tag: 'AF-0009', name: 'Patient Monitor V100', categoryId: 'c4', categoryName: 'Medical Equipment', serialNumber: 'PM-V100-77', acquisitionDate: '2021-04-12', acquisitionCost: 3400, condition: 'Poor', status: 'Retired', departmentId: 'd3', departmentName: 'Operations', location: 'Storage — Deprecated', isBookable: false },
  { id: 'a10', tag: 'AF-0010', name: 'Projector Epson CB-2150', categoryId: 'c2', categoryName: 'Monitors', serialNumber: 'EP-2150-09', condition: 'Good', status: 'Available', departmentId: 'd5', departmentName: 'Facilities', location: 'AV Cabinet', isBookable: true },
  { id: 'a11', tag: 'AF-0111', name: 'Lenovo ThinkPad X1', categoryId: 'c1', categoryName: 'Laptops', serialNumber: 'LT-X1-44021', acquisitionDate: '2024-02-20', acquisitionCost: 1900, condition: 'New', status: 'Allocated', departmentId: 'd1', departmentName: 'Engineering', location: 'Floor 3 — Desk 08', isBookable: false, currentHolder: { userId: 'u4', userName: 'James Okafor', departmentName: 'Engineering' } },
  { id: 'a12', tag: 'AF-0114', name: 'Dell Latitude 7440', categoryId: 'c1', categoryName: 'Laptops', serialNumber: 'DL7440-88X12', acquisitionDate: '2023-08-14', acquisitionCost: 1650, condition: 'Good', status: 'Allocated', departmentId: 'd1', departmentName: 'Engineering', location: 'Floor 3 — Desk 14', isBookable: false, currentHolder: { userId: 'u1', userName: 'Priya Shah', departmentName: 'Engineering' } },
  { id: 'a13', tag: 'AF-0115', name: 'Ford Transit Van 07', categoryId: 'c3', categoryName: 'Vehicles', serialNumber: 'FT-2024-007', acquisitionDate: '2024-03-01', acquisitionCost: 38000, condition: 'New', status: 'Reserved', departmentId: 'd3', departmentName: 'Operations', location: 'Vehicle Bay', isBookable: true },
  { id: 'a14', tag: 'AF-0116', name: 'Defibrillator Zoll AED', categoryId: 'c4', categoryName: 'Medical Equipment', serialNumber: 'Z-AED-3301', acquisitionDate: '2022-07-30', acquisitionCost: 2100, condition: 'Good', status: 'Lost', departmentId: 'd3', departmentName: 'Operations', location: 'Unknown', isBookable: false },
  { id: 'a15', tag: 'AF-0117', name: 'Logitech Conference Cam', categoryId: 'c2', categoryName: 'Monitors', serialNumber: 'LG-CC-5520', condition: 'Good', status: 'Disposed', departmentId: 'd5', departmentName: 'Facilities', location: 'Disposed — E-Waste', isBookable: false },
];

const allocations: AllocationRecord[] = [
  { id: 'al1', assetId: 'a1', assetTag: 'AF-0001', assetName: 'Dell Latitude 5440', holderUserId: 'u1', holderUserName: 'Priya Shah', holderDepartmentId: 'd1', holderDepartmentName: 'Engineering', allocatedAt: '2024-05-01T09:00:00Z', expectedReturnDate: '2025-05-01', status: 'active' },
  { id: 'al2', assetId: 'a3', assetTag: 'AF-0003', assetName: 'Toyota Hilux Fleet 03', holderUserId: 'u8', holderUserName: 'Tom Bridger', holderDepartmentId: 'd3', holderDepartmentName: 'Operations', allocatedAt: '2024-06-10T08:00:00Z', status: 'active' },
  { id: 'al3', assetId: 'a8', assetTag: 'AF-0008', assetName: 'Dell PowerEdge R650', holderUserId: 'u5', holderUserName: 'Sara Lindqvist', holderDepartmentId: 'd2', holderDepartmentName: 'IT', allocatedAt: '2024-04-15T10:00:00Z', status: 'active' },
  { id: 'al4', assetId: 'a11', assetTag: 'AF-0111', assetName: 'Lenovo ThinkPad X1', holderUserId: 'u4', holderUserName: 'James Okafor', holderDepartmentId: 'd1', holderDepartmentName: 'Engineering', allocatedAt: '2024-07-01T09:30:00Z', expectedReturnDate: '2025-07-01', status: 'active' },
  { id: 'al5', assetId: 'a12', assetTag: 'AF-0114', assetName: 'Dell Latitude 7440', holderUserId: 'u1', holderUserName: 'Priya Shah', holderDepartmentId: 'd1', holderDepartmentName: 'Engineering', allocatedAt: '2024-03-20T11:00:00Z', expectedReturnDate: '2025-03-20', status: 'overdue' },
  { id: 'al6', assetId: 'a2', assetTag: 'AF-0002', assetName: 'HP EliteDisplay 27', holderUserId: 'u5', holderUserName: 'Sara Lindqvist', allocatedAt: '2024-01-10T10:00:00Z', returnedAt: '2024-04-01T15:00:00Z', returnConditionNotes: 'No issues', status: 'returned' },
];

const transferRequests: TransferRequest[] = [
  { id: 'tr1', assetId: 'a1', assetTag: 'AF-0001', assetName: 'Dell Latitude 5440', fromUserId: 'u1', fromUserName: 'Priya Shah', requestedToUserId: 'u4', requestedToUserName: 'James Okafor', reason: 'Project handover — Q3 reassignment', status: 'pending', createdAt: '2025-01-08T14:00:00Z' },
  { id: 'tr2', assetId: 'a3', assetTag: 'AF-0003', assetName: 'Toyota Hilux Fleet 03', fromUserId: 'u8', fromUserName: 'Tom Bridger', requestedToDepartmentId: 'd4', requestedToDepartmentName: 'Procurement', reason: 'Procurement team needs vehicle for supplier visits', status: 'pending', createdAt: '2025-01-10T09:00:00Z' },
  { id: 'tr3', assetId: 'a8', assetTag: 'AF-0008', assetName: 'Dell PowerEdge R650', fromUserId: 'u5', fromUserName: 'Sara Lindqvist', requestedToUserId: 'u2', requestedToUserName: 'Marcus Chen', status: 'approved', createdAt: '2025-01-05T11:00:00Z' },
];

const bookings: Booking[] = [
  { id: 'b1', assetId: 'a5', assetName: 'Conference Room Aurora', assetTag: 'AF-0005', userId: 'u7', userName: 'Aisha Rahman', departmentId: 'd4', departmentName: 'Procurement', startTime: '2025-01-15T09:00:00Z', endTime: '2025-01-15T10:00:00Z', status: 'active' },
  { id: 'b2', assetId: 'a5', assetName: 'Conference Room Aurora', assetTag: 'AF-0005', userId: 'u1', userName: 'Priya Shah', departmentId: 'd1', departmentName: 'Engineering', startTime: '2025-01-15T11:00:00Z', endTime: '2025-01-15T12:30:00Z', status: 'active' },
  { id: 'b3', assetId: 'a5', assetName: 'Conference Room Aurora', assetTag: 'AF-0005', userId: 'u3', userName: 'Elena Volkov', departmentId: 'd3', departmentName: 'Operations', startTime: '2025-01-15T14:00:00Z', endTime: '2025-01-15T15:00:00Z', status: 'active' },
  { id: 'b4', assetId: 'a7', assetName: 'Bosch Drill Set', assetTag: 'AF-0007', userId: 'u8', userName: 'Tom Bridger', startTime: '2025-01-15T10:00:00Z', endTime: '2025-01-15T12:00:00Z', status: 'active' },
];

const maintenanceRequests: MaintenanceRequest[] = [
  { id: 'm1', assetId: 'a4', assetTag: 'AF-0004', assetName: 'Ultrasound Probe X7', issueDescription: 'Display flickering during operation, intermittent signal loss', priority: 'High', status: 'Pending', requestedByUserId: 'u3', requestedByUserName: 'Elena Volkov', createdAt: '2025-01-10T08:00:00Z' },
  { id: 'm2', assetId: 'a1', assetTag: 'AF-0001', assetName: 'Dell Latitude 5440', issueDescription: 'Battery drains within 2 hours, not holding charge', priority: 'Medium', status: 'Approved', requestedByUserId: 'u1', requestedByUserName: 'Priya Shah', createdAt: '2025-01-08T10:00:00Z' },
  { id: 'm3', assetId: 'a3', assetTag: 'AF-0003', assetName: 'Toyota Hilux Fleet 03', issueDescription: 'Brake pad replacement — scheduled service', priority: 'Low', status: 'Technician Assigned', technicianName: 'Ravi Motors', requestedByUserId: 'u8', requestedByUserName: 'Tom Bridger', createdAt: '2025-01-06T07:00:00Z' },
  { id: 'm4', assetId: 'a8', assetTag: 'AF-0008', assetName: 'Dell PowerEdge R650', issueDescription: 'RAID array degraded, drive 2 showing errors', priority: 'Critical', status: 'In Progress', technicianName: 'IT Support Team', requestedByUserId: 'u5', requestedByUserName: 'Sara Lindqvist', createdAt: '2025-01-11T14:00:00Z' },
  { id: 'm5', assetId: 'a2', assetTag: 'AF-0002', assetName: 'HP EliteDisplay 27', issueDescription: 'Dead pixel cluster top-left quadrant', priority: 'Low', status: 'Resolved', technicianName: 'Display Services Co.', requestedByUserId: 'u2', requestedByUserName: 'Marcus Chen', createdAt: '2025-01-03T09:00:00Z', resolutionNotes: 'Panel replaced under warranty, tested OK' },
  { id: 'm6', assetId: 'a10', assetTag: 'AF-0010', assetName: 'Projector Epson CB-2150', issueDescription: 'Lamp dim, replacement needed', priority: 'Medium', status: 'Pending', requestedByUserId: 'u7', requestedByUserName: 'Aisha Rahman', createdAt: '2025-01-12T11:00:00Z' },
];

const auditCycles: AuditCycle[] = [
  { id: 'ac1', scopeDepartmentId: 'd1', scopeDepartmentName: 'Engineering', startDate: '2025-01-12', endDate: '2025-01-19', auditorUserIds: ['u2', 'u3'], auditorNames: ['Marcus Chen', 'Elena Volkov'], status: 'in_progress' },
  { id: 'ac2', scopeLocation: 'Server Room A', startDate: '2024-12-01', endDate: '2024-12-05', auditorUserIds: ['u2'], auditorNames: ['Marcus Chen'], status: 'closed' },
];

const auditItems: AuditItem[] = [
  { id: 'ai1', cycleId: 'ac1', assetId: 'a1', assetTag: 'AF-0001', assetName: 'Dell Latitude 5440', expectedLocation: 'Floor 3 — Desk 12', result: 'Verified' },
  { id: 'ai2', cycleId: 'ac1', assetId: 'a11', assetTag: 'AF-0111', assetName: 'Lenovo ThinkPad X1', expectedLocation: 'Floor 3 — Desk 08', result: 'Verified' },
  { id: 'ai3', cycleId: 'ac1', assetId: 'a12', assetTag: 'AF-0114', assetName: 'Dell Latitude 7440', expectedLocation: 'Floor 3 — Desk 14', result: 'Missing' },
  { id: 'ai4', cycleId: 'ac1', assetId: 'a2', assetTag: 'AF-0002', assetName: 'HP EliteDisplay 27', expectedLocation: 'IT Storage Room', result: 'Damaged', notes: 'Screen cracked during handling' },
];

const notifications: Notification[] = [
  { id: 'n1', type: 'overdue', title: 'Overdue Return', message: 'AF-0114 — Dell Latitude 7440 is overdue from Priya Shah', read: false, createdAt: '2025-01-12T08:00:00Z', entityTag: 'AF-0114' },
  { id: 'n2', type: 'transfer', title: 'Transfer Request Pending', message: 'Transfer request for AF-0001 awaiting your approval', read: false, createdAt: '2025-01-11T14:00:00Z', entityTag: 'AF-0001' },
  { id: 'n3', type: 'maintenance', title: 'Maintenance Approved', message: 'Your maintenance request for AF-0001 has been approved', read: false, createdAt: '2025-01-10T10:00:00Z', entityTag: 'AF-0001' },
  { id: 'n4', type: 'booking', title: 'Booking Confirmed', message: 'Conference Room Aurora booked for Jan 15, 11:00–12:30', read: true, createdAt: '2025-01-09T16:00:00Z', entityTag: 'AF-0005' },
  { id: 'n5', type: 'audit', title: 'Audit Started', message: 'Engineering audit cycle has begun — 4 assets to verify', read: true, createdAt: '2025-01-12T09:00:00Z' },
  { id: 'n6', type: 'assignment', title: 'Asset Allocated', message: 'AF-0111 — Lenovo ThinkPad X1 allocated to James Okafor', read: true, createdAt: '2025-01-07T09:30:00Z', entityTag: 'AF-0111' },
];

const activityFeed: ActivityEntry[] = [
  { id: 'act1', timestamp: '2025-01-12T08:00:00Z', description: 'Overdue return flagged for AF-0114 held by Priya Shah', entityTag: 'AF-0114', type: 'overdue' },
  { id: 'act2', timestamp: '2025-01-12T07:30:00Z', description: 'Audit cycle started for Engineering department', type: 'audit' },
  { id: 'act3', timestamp: '2025-01-11T14:00:00Z', description: 'Transfer request created for AF-0001 to James Okafor', entityTag: 'AF-0001', type: 'transfer' },
  { id: 'act4', timestamp: '2025-01-11T10:00:00Z', description: 'Maintenance request submitted for AF-0004 — High priority', entityTag: 'AF-0004', type: 'maintenance' },
  { id: 'act5', timestamp: '2025-01-10T09:00:00Z', description: 'AF-0111 allocated to James Okafor (Engineering)', entityTag: 'AF-0111', type: 'assignment' },
  { id: 'act6', timestamp: '2025-01-09T16:00:00Z', description: 'Conference Room Aurora booked by Priya Shah', entityTag: 'AF-0005', type: 'booking' },
  { id: 'act7', timestamp: '2025-01-08T10:00:00Z', description: 'Maintenance request for AF-0001 approved', entityTag: 'AF-0001', type: 'maintenance' },
];

// ---- Reports data ----
const utilizationReport: UtilizationReport = {
  departments: [
    { name: 'Engineering', allocated: 3, available: 1, total: 4 },
    { name: 'IT', allocated: 2, available: 2, total: 4 },
    { name: 'Operations', allocated: 2, available: 0, total: 2 },
    { name: 'Procurement', allocated: 0, available: 0, total: 0 },
    { name: 'Facilities', allocated: 0, available: 3, total: 3 },
  ],
};
const maintenanceFrequencyReport: MaintenanceFrequencyReport = {
  months: [
    { month: 'Aug', count: 3 }, { month: 'Sep', count: 5 }, { month: 'Oct', count: 2 },
    { month: 'Nov', count: 6 }, { month: 'Dec', count: 4 }, { month: 'Jan', count: 6 },
  ],
};
const lifecycleReport: LifecycleReport = {
  assets: [
    { id: 'a4', tag: 'AF-0004', name: 'Ultrasound Probe X7', event: 'Maintenance Due', eventDate: '2025-01-20', urgency: 'high' },
    { id: 'a9', tag: 'AF-0009', name: 'Patient Monitor V100', event: 'Retirement Eligible', eventDate: '2025-02-01', urgency: 'medium' },
    { id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 5440', event: 'Warranty Expiry', eventDate: '2025-03-15', urgency: 'low' },
    { id: 'a3', tag: 'AF-0003', name: 'Toyota Hilux Fleet 03', event: 'Service Due', eventDate: '2025-01-25', urgency: 'high' },
  ],
};
const departmentAllocationReport: DepartmentAllocationReport = {
  departments: [
    { name: 'Engineering', assetCount: 4, percentage: 27 },
    { name: 'IT', assetCount: 4, percentage: 27 },
    { name: 'Operations', assetCount: 5, percentage: 33 },
    { name: 'Facilities', assetCount: 2, percentage: 13 },
  ],
};
const bookingHeatmapReport: BookingHeatmapReport = {
  grid: Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 12 }, (_, h) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
      hour: 8 + h,
      count: Math.floor(Math.random() * 6),
    })),
  ),
};

// ---- Mock handler ----
function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

function parseQuery(path: string): { segments: string[]; query: Record<string, string> } {
  const [rawPath, queryString] = path.split('?');
  const segments = rawPath.split('/').filter(Boolean);
  const query: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { segments, query };
}

function isoToTime(iso: string): number {
  return new Date(iso).getTime();
}
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return isoToTime(aStart) < isoToTime(bEnd) && isoToTime(bStart) < isoToTime(aEnd);
}

export const mockData = {
  handle<T>(method: string, path: string, body?: unknown): T {
    const { segments, query } = parseQuery(path);

    // ---- Auth ----
    if (segments[0] === 'auth') {
      if (segments[1] === 'login' && method === 'POST') {
        const b = body as { email: string; password: string };
        const user = users.find((u) => u.email === b.email);
        if (!user) throw makeError('AUTH_INVALID', 'Invalid email or password', 401);
        return ok({ user, token: 'mock-jwt-' + user.id }) as unknown as T;
      }
      if (segments[1] === 'signup' && method === 'POST') {
        const b = body as { name: string; email: string; password: string };
        const newUser: User = { id: 'u' + (users.length + 1), name: b.name, email: b.email, role: 'Employee', status: 'active' };
        users.push(newUser);
        return ok({ user: newUser, token: 'mock-jwt-' + newUser.id }) as unknown as T;
      }
      if (segments[1] === 'me' && method === 'GET') {
        return ok(users[0]) as unknown as T; // Priya Shah as demo user
      }
    }

    // ---- Dashboard ----
    if (segments[0] === 'dashboard' && method === 'GET') {
      const data: DashboardData = {
        kpis: {
          assetsAvailable: assets.filter((a) => a.status === 'Available').length,
          assetsAllocated: assets.filter((a) => a.status === 'Allocated').length,
          maintenanceToday: maintenanceRequests.filter((m) => m.status === 'In Progress' || m.status === 'Technician Assigned').length,
          activeBookings: bookings.filter((b) => b.status === 'active').length,
          pendingTransfers: transferRequests.filter((t) => t.status === 'pending').length,
          upcomingReturns: 3,
        },
        overdueReturns: allocations.filter((a) => a.status === 'overdue'),
        upcomingReturns: allocations.filter((a) => a.status === 'active' && a.expectedReturnDate).slice(0, 5),
      };
      return ok(data) as unknown as T;
    }

    // ---- Departments ----
    if (segments[0] === 'departments') {
      if (method === 'GET') return ok(departments) as unknown as T;
      if (method === 'POST') {
        const b = body as Partial<Department>;
        const d: Department = { id: 'd' + (departments.length + 1), name: b.name ?? '', headUserId: b.headUserId, status: b.status ?? 'active' };
        departments.push(d);
        return ok(d) as unknown as T;
      }
      if (method === 'PUT' && segments[1]) {
        const d = departments.find((x) => x.id === segments[1]);
        if (d) Object.assign(d, body);
        return ok(d) as unknown as T;
      }
    }

    // ---- Categories ----
    if (segments[0] === 'categories') {
      if (method === 'GET') return ok(categories) as unknown as T;
      if (method === 'POST') {
        const b = body as Partial<Category>;
        const c: Category = { id: 'c' + (categories.length + 1), name: b.name ?? '', customFields: b.customFields };
        categories.push(c);
        return ok(c) as unknown as T;
      }
    }

    // ---- Users ----
    if (segments[0] === 'users') {
      if (method === 'GET') {
        let result = [...users];
        if (query.department) result = result.filter((u) => u.departmentId === query.department);
        if (query.role) result = result.filter((u) => u.role === query.role);
        if (query.status) result = result.filter((u) => u.status === query.status);
        return ok(result) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'role') {
        const u = users.find((x) => x.id === segments[1]);
        if (u) u.role = (body as { role: User['role'] }).role;
        return ok(u) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'status') {
        const u = users.find((x) => x.id === segments[1]);
        if (u) u.status = (body as { status: User['status'] }).status;
        return ok(u) as unknown as T;
      }
    }

    // ---- Assets ----
    if (segments[0] === 'assets') {
      if (method === 'GET' && !segments[1]) {
        let result = [...assets];
        if (query.search) {
          const s = query.search.toLowerCase();
          result = result.filter((a) => a.tag.toLowerCase().includes(s) || a.name.toLowerCase().includes(s) || (a.serialNumber ?? '').toLowerCase().includes(s));
        }
        if (query.category) result = result.filter((a) => a.categoryId === query.category);
        if (query.status) result = result.filter((a) => a.status === query.status);
        if (query.department) result = result.filter((a) => a.departmentId === query.department);
        if (query.location) result = result.filter((a) => a.location?.includes(query.location));
        return ok(result) as unknown as T;
      }
      if (method === 'GET' && segments[1]) {
        const a = assets.find((x) => x.id === segments[1]);
        if (!a) throw makeError('NOT_FOUND', 'Asset not found', 404);
        const assetAllocations = allocations.filter((al) => al.assetId === a.id);
        const assetMaintenance = maintenanceRequests.filter((m) => m.assetId === a.id);
        return ok({ ...a, allocationHistory: assetAllocations, maintenanceHistory: assetMaintenance }) as unknown as T;
      }
      if (method === 'POST') {
        const b = body as Partial<Asset>;
        const a: Asset = {
          id: 'a' + (assets.length + 1),
          tag: 'AF-' + String(assets.length + 1).padStart(4, '0'),
          name: b.name ?? '',
          categoryId: b.categoryId ?? '',
          categoryName: categories.find((c) => c.id === b.categoryId)?.name ?? '',
          serialNumber: b.serialNumber,
          condition: b.condition ?? 'Good',
          status: 'Available',
          location: b.location,
          isBookable: b.isBookable ?? false,
        };
        assets.push(a);
        return ok(a) as unknown as T;
      }
      if (method === 'PUT' && segments[1]) {
        const a = assets.find((x) => x.id === segments[1]);
        if (a) Object.assign(a, body);
        return ok(a) as unknown as T;
      }
    }

    // ---- Allocations ----
    if (segments[0] === 'allocations') {
      if (method === 'POST') {
        const b = body as { assetId: string; holderUserId?: string; holderDepartmentId?: string; expectedReturnDate?: string };
        const asset = assets.find((a) => a.id === b.assetId);
        if (!asset) throw makeError('NOT_FOUND', 'Asset not found', 404);
        if (asset.status === 'Allocated') {
          throw makeError('ALREADY_ALLOCATED', 'Asset is already allocated', 409, { currentHolder: asset.currentHolder });
        }
        const holder = users.find((u) => u.id === b.holderUserId);
        const dept = departments.find((d) => d.id === b.holderDepartmentId);
        const rec: AllocationRecord = {
          id: 'al' + (allocations.length + 1),
          assetId: asset.id,
          assetTag: asset.tag,
          assetName: asset.name,
          holderUserId: holder?.id,
          holderUserName: holder?.name,
          holderDepartmentId: dept?.id,
          holderDepartmentName: dept?.name,
          allocatedAt: new Date().toISOString(),
          expectedReturnDate: b.expectedReturnDate,
          status: 'active',
        };
        allocations.push(rec);
        asset.status = 'Allocated';
        asset.currentHolder = holder ? { userId: holder.id, userName: holder.name, departmentName: holder.departmentName ?? '' } : null;
        return ok(rec) as unknown as T;
      }
      if (method === 'POST' && segments[2] === 'return') {
        const rec = allocations.find((a) => a.id === segments[1]);
        if (rec) {
          rec.status = 'returned';
          rec.returnedAt = new Date().toISOString();
          rec.returnConditionNotes = (body as { returnConditionNotes?: string }).returnConditionNotes;
          const asset = assets.find((a) => a.id === rec.assetId);
          if (asset) { asset.status = 'Available'; asset.currentHolder = null; }
        }
        return ok(rec) as unknown as T;
      }
      if (method === 'GET') {
        let result = [...allocations];
        if (query.assetId) result = result.filter((a) => a.assetId === query.assetId);
        if (query.overdue === 'true') result = result.filter((a) => a.status === 'overdue');
        return ok(result) as unknown as T;
      }
    }

    // ---- Transfer Requests ----
    if (segments[0] === 'transfer-requests') {
      if (method === 'POST') {
        const b = body as { assetId: string; requestedToUserId?: string; requestedToDepartmentId?: string; reason?: string };
        const asset = assets.find((a) => a.id === b.assetId);
        if (!asset) throw makeError('NOT_FOUND', 'Asset not found', 404);
        const toUser = users.find((u) => u.id === b.requestedToUserId);
        const toDept = departments.find((d) => d.id === b.requestedToDepartmentId);
        const tr: TransferRequest = {
          id: 'tr' + (transferRequests.length + 1),
          assetId: asset.id,
          assetTag: asset.tag,
          assetName: asset.name,
          fromUserId: asset.currentHolder?.userId ?? 'u1',
          fromUserName: asset.currentHolder?.userName ?? 'Priya Shah',
          requestedToUserId: toUser?.id,
          requestedToUserName: toUser?.name,
          requestedToDepartmentId: toDept?.id,
          requestedToDepartmentName: toDept?.name,
          reason: b.reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        transferRequests.push(tr);
        return ok(tr) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'approve') {
        const tr = transferRequests.find((t) => t.id === segments[1]);
        if (tr) tr.status = 'approved';
        return ok(tr) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'reject') {
        const tr = transferRequests.find((t) => t.id === segments[1]);
        if (tr) tr.status = 'rejected';
        return ok(tr) as unknown as T;
      }
      if (method === 'GET') return ok(transferRequests) as unknown as T;
    }

    // ---- Bookings ----
    if (segments[0] === 'bookings') {
      if (method === 'POST') {
        const b = body as { assetId: string; startTime: string; endTime: string; departmentId?: string };
        const existing = bookings.filter((bk) => bk.assetId === b.assetId && bk.status === 'active');
        const conflict = existing.find((bk) => rangesOverlap(bk.startTime, bk.endTime, b.startTime, b.endTime));
        if (conflict) {
          throw makeError('BOOKING_CONFLICT', 'This slot overlaps with an existing booking', 409, { conflictingBooking: conflict });
        }
        const asset = assets.find((a) => a.id === b.assetId);
        const dept = departments.find((d) => d.id === b.departmentId);
        const bk: Booking = {
          id: 'b' + (bookings.length + 1),
          assetId: b.assetId,
          assetName: asset?.name ?? '',
          assetTag: asset?.tag ?? '',
          userId: 'u1',
          userName: 'Priya Shah',
          departmentId: dept?.id,
          departmentName: dept?.name,
          startTime: b.startTime,
          endTime: b.endTime,
          status: 'active',
        };
        bookings.push(bk);
        return ok(bk) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'cancel') {
        const bk = bookings.find((b) => b.id === segments[1]);
        if (bk) bk.status = 'cancelled';
        return ok(bk) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'reschedule') {
        const bk = bookings.find((b) => b.id === segments[1]);
        if (bk) {
          const b2 = body as { startTime: string; endTime: string };
          bk.startTime = b2.startTime;
          bk.endTime = b2.endTime;
        }
        return ok(bk) as unknown as T;
      }
      if (method === 'GET') {
        let result = [...bookings];
        if (query.assetId) result = result.filter((b) => b.assetId === query.assetId);
        return ok(result) as unknown as T;
      }
    }

    // ---- Maintenance ----
    if (segments[0] === 'maintenance-requests') {
      if (method === 'POST') {
        const b = body as { assetId: string; issueDescription: string; priority: string; photoUrl?: string };
        const asset = assets.find((a) => a.id === b.assetId);
        const m: MaintenanceRequest = {
          id: 'm' + (maintenanceRequests.length + 1),
          assetId: b.assetId,
          assetTag: asset?.tag ?? '',
          assetName: asset?.name ?? '',
          issueDescription: b.issueDescription,
          priority: b.priority as MaintenanceRequest['priority'],
          photoUrl: b.photoUrl,
          status: 'Pending',
          requestedByUserId: 'u1',
          requestedByUserName: 'Priya Shah',
          createdAt: new Date().toISOString(),
        };
        maintenanceRequests.push(m);
        return ok(m) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'approve') {
        const m = maintenanceRequests.find((x) => x.id === segments[1]);
        if (m) m.status = 'Approved';
        return ok(m) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'reject') {
        const m = maintenanceRequests.find((x) => x.id === segments[1]);
        if (m) { m.status = 'Resolved'; m.rejectReason = (body as { reason?: string }).reason; }
        return ok(m) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'assign-technician') {
        const m = maintenanceRequests.find((x) => x.id === segments[1]);
        if (m) { m.status = 'Technician Assigned'; m.technicianName = (body as { technicianName: string }).technicianName; }
        return ok(m) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'start') {
        const m = maintenanceRequests.find((x) => x.id === segments[1]);
        if (m) m.status = 'In Progress';
        return ok(m) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'resolve') {
        const m = maintenanceRequests.find((x) => x.id === segments[1]);
        if (m) { m.status = 'Resolved'; m.resolutionNotes = (body as { resolutionNotes?: string }).resolutionNotes; }
        return ok(m) as unknown as T;
      }
      if (method === 'GET') {
        let result = [...maintenanceRequests];
        if (query.assetId) result = result.filter((m) => m.assetId === query.assetId);
        if (query.status) result = result.filter((m) => m.status === query.status);
        return ok(result) as unknown as T;
      }
    }

    // ---- Audit ----
    if (segments[0] === 'audit-cycles') {
      if (method === 'POST') {
        const b = body as { scopeDepartmentId?: string; scopeLocation?: string; startDate: string; endDate: string; auditorUserIds: string[] };
        const dept = departments.find((d) => d.id === b.scopeDepartmentId);
        const aud = users.filter((u) => b.auditorUserIds.includes(u.id));
        const ac: AuditCycle = {
          id: 'ac' + (auditCycles.length + 1),
          scopeDepartmentId: b.scopeDepartmentId,
          scopeDepartmentName: dept?.name,
          scopeLocation: b.scopeLocation,
          startDate: b.startDate,
          endDate: b.endDate,
          auditorUserIds: b.auditorUserIds,
          auditorNames: aud.map((u) => u.name),
          status: 'planned',
        };
        auditCycles.push(ac);
        return ok(ac) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'start') {
        const ac = auditCycles.find((x) => x.id === segments[1]);
        if (ac) ac.status = 'in_progress';
        return ok(ac) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'close') {
        const ac = auditCycles.find((x) => x.id === segments[1]);
        if (ac) ac.status = 'closed';
        return ok(ac) as unknown as T;
      }
      if (method === 'GET' && !segments[2]) return ok(auditCycles) as unknown as T;
      if (method === 'GET' && segments[2] === 'discrepancies') {
        const items = auditItems.filter((i) => i.cycleId === segments[1] && (i.result === 'Missing' || i.result === 'Damaged'));
        const discreps = items.map((i) => ({ id: 'disc' + i.id, auditItem: i, type: i.result as 'Missing' | 'Damaged', notes: i.notes }));
        return ok(discreps) as unknown as T;
      }
    }
    if (segments[0] === 'audit-items') {
      if (method === 'PATCH' && segments[1]) {
        const item = auditItems.find((i) => i.id === segments[1]);
        if (item) { item.result = (body as { result: AuditItem['result'] }).result; item.notes = (body as { notes?: string }).notes; }
        return ok(item) as unknown as T;
      }
      if (method === 'GET') {
        let result = [...auditItems];
        if (query.cycleId) result = result.filter((i) => i.cycleId === query.cycleId);
        return ok(result) as unknown as T;
      }
    }

    // ---- Reports ----
    if (segments[0] === 'reports') {
      if (segments[1] === 'utilization') return ok(utilizationReport) as unknown as T;
      if (segments[1] === 'maintenance-frequency') return ok(maintenanceFrequencyReport) as unknown as T;
      if (segments[1] === 'upcoming-lifecycle') return ok(lifecycleReport) as unknown as T;
      if (segments[1] === 'department-allocation') return ok(departmentAllocationReport) as unknown as T;
      if (segments[1] === 'booking-heatmap') return ok(bookingHeatmapReport) as unknown as T;
      if (segments[1] === 'export') return ok({ url: '#export-' + Date.now() }) as unknown as T;
    }

    // ---- Notifications ----
    if (segments[0] === 'notifications') {
      if (method === 'GET') {
        let result = [...notifications];
        if (query.unreadOnly === 'true') result = result.filter((n) => !n.read);
        return ok(result) as unknown as T;
      }
      if (method === 'PATCH' && segments[2] === 'read') {
        const n = notifications.find((x) => x.id === segments[1]);
        if (n) n.read = true;
        return ok(n) as unknown as T;
      }
    }

    // ---- Activity feed (extra endpoint for dashboard) ----
    if (segments[0] === 'activity' && method === 'GET') {
      return ok(activityFeed) as unknown as T;
    }

    throw makeError('NOT_FOUND', `No mock handler for ${method} ${path}`, 404);
  },
};

function makeError(code: string, message: string, status: number, extras?: Record<string, unknown>): Error {
  const e = new Error(message) as Error & { code: string; status: number; details?: Record<string, string>; currentHolder?: unknown };
  e.code = code;
  e.status = status;
  if (extras) {
    if (extras.details) e.details = extras.details as Record<string, string>;
    if (extras.currentHolder) e.currentHolder = extras.currentHolder;
    if (extras.conflictingBooking) (e as unknown as { conflictingBooking: unknown }).conflictingBooking = extras.conflictingBooking;
  }
  return e;
}
