const prisma = require('../../config/prisma');

/**
 * Fetch KPI counts and overdue/upcoming returns lists
 */
const getDashboardData = async () => {
  const now = new Date();

  // 1. Query KPI counts in parallel
  const [
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturnsCount,
  ] = await Promise.all([
    // Available assets
    prisma.asset.count({ where: { status: 'Available' } }),
    // Allocated assets
    prisma.asset.count({ where: { status: 'Allocated' } }),
    // Active maintenance requests (Approved, TechnicianAssigned, InProgress)
    prisma.maintenanceRequest.count({
      where: { status: { in: ['Approved', 'TechnicianAssigned', 'InProgress'] } },
    }),
    // Active bookings (Ongoing or Upcoming that haven't ended yet)
    prisma.booking.count({
      where: {
        status: 'Upcoming',
        endTime: { gte: now },
      },
    }),
    // Pending transfer requests
    prisma.transferRequest.count({ where: { status: 'Requested' } }),
    // Count of active allocations with upcoming return dates
    prisma.allocation.count({
      where: {
        status: 'Active',
        expectedReturnDate: { gte: now },
      },
    }),
  ]);

  // 2. Query overdue returns (expectedReturnDate in the past and status is Active)
  const overdueAllocations = await prisma.allocation.findMany({
    where: {
      status: 'Active',
      expectedReturnDate: { lt: now },
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      holderUser: { select: { id: true, name: true } },
      holderDepartment: { select: { id: true, name: true } },
    },
    orderBy: {
      expectedReturnDate: 'asc',
    },
  });

  // Map to frontend AllocationRecord type
  const overdueReturns = overdueAllocations.map((alloc) => ({
    id: alloc.id,
    assetId: alloc.assetId,
    assetTag: alloc.asset.assetTag,
    assetName: alloc.asset.name,
    holderUserId: alloc.holderUserId,
    holderUserName: alloc.holderUser ? alloc.holderUser.name : null,
    holderDepartmentId: alloc.holderDepartmentId,
    holderDepartmentName: alloc.holderDepartment ? alloc.holderDepartment.name : null,
    allocatedAt: alloc.allocatedAt.toISOString(),
    expectedReturnDate: alloc.expectedReturnDate
      ? alloc.expectedReturnDate.toISOString().split('T')[0]
      : null,
    status: 'overdue',
  }));

  // 3. Query upcoming returns (expectedReturnDate in the future and status is Active)
  const upcomingAllocations = await prisma.allocation.findMany({
    where: {
      status: 'Active',
      expectedReturnDate: { gte: now },
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      holderUser: { select: { id: true, name: true } },
      holderDepartment: { select: { id: true, name: true } },
    },
    orderBy: {
      expectedReturnDate: 'asc',
    },
    take: 5,
  });

  const upcomingReturnsList = upcomingAllocations.map((alloc) => ({
    id: alloc.id,
    assetId: alloc.assetId,
    assetTag: alloc.asset.assetTag,
    assetName: alloc.asset.name,
    holderUserId: alloc.holderUserId,
    holderUserName: alloc.holderUser ? alloc.holderUser.name : null,
    holderDepartmentId: alloc.holderDepartmentId,
    holderDepartmentName: alloc.holderDepartment ? alloc.holderDepartment.name : null,
    allocatedAt: alloc.allocatedAt.toISOString(),
    expectedReturnDate: alloc.expectedReturnDate
      ? alloc.expectedReturnDate.toISOString().split('T')[0]
      : null,
    status: 'active',
  }));

  return {
    kpis: {
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns: upcomingReturnsCount,
    },
    overdueReturns,
    upcomingReturns: upcomingReturnsList,
  };
};

/**
 * Fetch dynamically compiled list of recent activities across all tables
 */
const getActivityFeed = async () => {
  const limit = 10;

  // Retrieve records from allocations, bookings, maintenance requests, and transfer requests
  const [allocations, bookings, maintenance, transfers] = await Promise.all([
    prisma.allocation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { name: true, assetTag: true } },
        holderUser: { select: { name: true } },
        holderDepartment: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { name: true, assetTag: true } },
        bookedByUser: { select: { name: true } },
      },
    }),
    prisma.maintenanceRequest.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { name: true, assetTag: true } },
      },
    }),
    prisma.transferRequest.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { name: true, assetTag: true } },
        requestedByUser: { select: { name: true } },
      },
    }),
  ]);

  const feed = [];

  // 1. Process allocations
  allocations.forEach((item) => {
    const holder = item.holderUser ? item.holderUser.name : (item.holderDepartment ? item.holderDepartment.name : 'Unknown');
    const verb = item.status === 'Returned' ? 'returned by' : 'allocated to';
    feed.push({
      id: `alloc-${item.id}`,
      timestamp: item.createdAt.toISOString(),
      description: `${item.asset.assetTag} — ${item.asset.name} was ${verb} ${holder}`,
      entityTag: item.asset.assetTag,
      type: 'assignment',
    });
  });

  // 2. Process bookings
  bookings.forEach((item) => {
    feed.push({
      id: `book-${item.id}`,
      timestamp: item.createdAt.toISOString(),
      description: `${item.asset.name} booked by ${item.bookedByUser.name}`,
      entityTag: item.asset.assetTag,
      type: 'booking',
    });
  });

  // 3. Process maintenance requests
  maintenance.forEach((item) => {
    feed.push({
      id: `maint-${item.id}`,
      timestamp: item.createdAt.toISOString(),
      description: `Maintenance request raised for ${item.asset.name} (Priority: ${item.priority})`,
      entityTag: item.asset.assetTag,
      type: 'maintenance',
    });
  });

  // 4. Process transfers
  transfers.forEach((item) => {
    const reasonText = item.reason ? ` (Reason: ${item.reason})` : '';
    feed.push({
      id: `transfer-${item.id}`,
      timestamp: item.createdAt.toISOString(),
      description: `Transfer request initiated for ${item.asset.name} by ${item.requestedByUser.name}${reasonText}`,
      entityTag: item.asset.assetTag,
      type: 'transfer',
    });
  });

  // Combine, sort by timestamp desc, and limit to top 10
  return feed
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

module.exports = {
  getDashboardData,
  getActivityFeed,
};
