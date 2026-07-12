export type Role = 'Employee' | 'DepartmentHead' | 'AssetManager' | 'Admin';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
  departmentName?: string;
  status: UserStatus;
}

export interface Department {
  id: string;
  name: string;
  headUserId?: string;
  headUserName?: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  customFields?: { name: string; type: string }[];
}

export type AssetStatus =
  | 'Available'
  | 'Allocated'
  | 'Reserved'
  | 'Under Maintenance'
  | 'Lost'
  | 'Retired'
  | 'Disposed';

export interface Asset {
  id: string;
  tag: string;
  name: string;
  categoryId: string;
  categoryName: string;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  status: AssetStatus;
  departmentId?: string;
  departmentName?: string;
  location?: string;
  photoUrl?: string;
  isBookable: boolean;
  currentHolder?: { userId: string; userName: string; departmentName: string } | null;
  allocationHistory?: AllocationRecord[];
  maintenanceHistory?: MaintenanceRequest[];
}

export interface AllocationRecord {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  holderUserId?: string;
  holderUserName?: string;
  holderDepartmentId?: string;
  holderDepartmentName?: string;
  allocatedAt: string;
  expectedReturnDate?: string;
  returnedAt?: string;
  returnConditionNotes?: string;
  status: 'active' | 'returned' | 'overdue';
}

export interface TransferRequest {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  fromUserId: string;
  fromUserName: string;
  requestedToUserId?: string;
  requestedToUserName?: string;
  requestedToDepartmentId?: string;
  requestedToDepartmentName?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Booking {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  userId: string;
  userName: string;
  departmentId?: string;
  departmentName?: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'cancelled';
}

export type MaintenanceStatus =
  | 'Pending'
  | 'Approved'
  | 'Technician Assigned'
  | 'In Progress'
  | 'Resolved';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  issueDescription: string;
  priority: Priority;
  photoUrl?: string;
  status: MaintenanceStatus;
  technicianName?: string;
  requestedByUserId: string;
  requestedByUserName: string;
  createdAt: string;
  resolutionNotes?: string;
  rejectReason?: string;
}

export interface AuditCycle {
  id: string;
  scopeDepartmentId?: string;
  scopeDepartmentName?: string;
  scopeLocation?: string;
  startDate: string;
  endDate: string;
  auditorUserIds: string[];
  auditorNames: string[];
  status: 'planned' | 'in_progress' | 'closed';
}

export interface AuditItem {
  id: string;
  cycleId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  expectedLocation: string;
  result: 'Verified' | 'Missing' | 'Damaged' | 'Pending';
  notes?: string;
}

export interface Discrepancy {
  id: string;
  auditItem: AuditItem;
  type: 'Missing' | 'Damaged';
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'assignment' | 'maintenance' | 'booking' | 'transfer' | 'overdue' | 'audit';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  entityTag?: string;
}

export interface DashboardData {
  kpis: {
    assetsAvailable: number;
    assetsAllocated: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    upcomingReturns: number;
  };
  overdueReturns: AllocationRecord[];
  upcomingReturns: AllocationRecord[];
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  description: string;
  entityTag?: string;
  type: 'assignment' | 'maintenance' | 'booking' | 'transfer' | 'overdue' | 'audit';
}

// Reports
export interface UtilizationReport {
  departments: { name: string; allocated: number; available: number; total: number }[];
}
export interface MaintenanceFrequencyReport {
  months: { month: string; count: number }[];
}
export interface LifecycleReport {
  assets: { id: string; tag: string; name: string; event: string; eventDate: string; urgency: 'high' | 'medium' | 'low' }[];
}
export interface DepartmentAllocationReport {
  departments: { name: string; assetCount: number; percentage: number }[];
}
export interface BookingHeatmapReport {
  grid: { day: string; hour: number; count: number }[][];
}
