const prisma = require('../../config/prisma');

/**
 * Get asset utilization stats grouped by department
 */
const getUtilizationReport = async () => {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true }
  });

  const availableCount = await prisma.asset.count({ where: { status: 'Available' } });
  const totalDepartments = departments.length || 1;
  const availableShare = Math.round(availableCount / totalDepartments);

  const deptStats = await Promise.all(
    departments.map(async (dept) => {
      const allocated = await prisma.allocation.count({
        where: {
          status: 'Active',
          OR: [
            { holderDepartmentId: dept.id },
            { holderUser: { departmentId: dept.id } }
          ]
        }
      });

      // Total scoped assets is allocated + its share of available pool
      const available = availableShare;
      const total = allocated + available;

      return {
        name: dept.name,
        total,
        allocated,
        available
      };
    })
  );

  return { departments: deptStats };
};

/**
 * Get maintenance request counts for each of the last 6 months
 */
const getMaintenanceFrequencyReport = async () => {
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(d);
    
    const endOfMonth = new Date(d);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const count = await prisma.maintenanceRequest.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      }
    });

    months.push({
      month: monthNames[startOfMonth.getMonth()],
      count
    });
  }

  return { months };
};

/**
 * Get assets with upcoming lifecycle events (maintenance or retirement review)
 */
const getLifecycleReport = async () => {
  const assets = await prisma.asset.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  const mappedAssets = assets.map((a, idx) => {
    // Generate mock but database-linked event properties based on condition/status
    let event = 'Routine Inspection';
    let urgency = 'low';
    let daysAhead = 15 + idx * 3;

    if (a.status === 'UnderMaintenance') {
      event = 'Maintenance Review';
      urgency = 'high';
      daysAhead = 2;
    } else if (a.condition === 'Fair') {
      event = 'Retirement Audit';
      urgency = 'medium';
      daysAhead = 7;
    } else if (a.condition === 'Poor') {
      event = 'Urgent Retirement';
      urgency = 'high';
      daysAhead = 1;
    }

    const eventDate = new Date(Date.now() + 86400000 * daysAhead)
      .toISOString()
      .split('T')[0];

    return {
      id: a.id,
      tag: a.assetTag,
      name: a.name,
      event,
      eventDate,
      urgency
    };
  });

  return { assets: mappedAssets };
};

/**
 * Get simple allocation breakdown by department
 */
const getDepartmentAllocationReport = async () => {
  const allocations = await prisma.allocation.findMany({
    where: { status: 'Active' },
    include: {
      holderDepartment: { select: { name: true } },
      holderUser: { include: { department: { select: { name: true } } } }
    }
  });

  const counts = {};
  allocations.forEach((a) => {
    const deptName = a.holderDepartment?.name || a.holderUser?.department?.name || 'Unassigned';
    counts[deptName] = (counts[deptName] || 0) + 1;
  });

  return {
    breakdown: Object.keys(counts).map((name) => ({
      department: name,
      count: counts[name]
    }))
  };
};

/**
 * Get booking heatmap (7 days of week x 12 hours from 8 AM to 7 PM)
 */
const getBookingHeatmapReport = async () => {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: 'Cancelled' } }
  });

  // Initialize 7 days (Mon-Sun) of 12 hours (8am - 7pm)
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 12 }, (_, hIdx) => ({
      hour: 8 + hIdx,
      count: 0
    }))
  );

  bookings.forEach((b) => {
    const start = new Date(b.startTime);
    
    // JS getDay() is 0 (Sun) - 6 (Sat)
    // Convert to 0 (Mon) - 6 (Sun)
    const jsDay = start.getDay();
    const dayIdx = (jsDay + 6) % 7;

    const hour = start.getHours();
    const hourIdx = hour - 8;

    if (dayIdx >= 0 && dayIdx < 7 && hourIdx >= 0 && hourIdx < 12) {
      grid[dayIdx][hourIdx].count += 1;
    }
  });

  return { grid };
};

/**
 * Generate CSV text for all assets to support report exports
 */
const exportAssetsCSV = async () => {
  const assets = await prisma.asset.findMany({
    include: {
      category: { select: { name: true } }
    },
    orderBy: { assetTag: 'asc' }
  });

  const headers = ['Asset Tag', 'Asset Name', 'Category', 'Serial Number', 'Location', 'Condition', 'Status'];
  const rows = assets.map((a) => [
    a.assetTag,
    `"${a.name.replace(/"/g, '""')}"`,
    a.category?.name || '—',
    a.serialNumber || '—',
    a.location || '—',
    a.condition,
    a.status
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');
};

module.exports = {
  getUtilizationReport,
  getMaintenanceFrequencyReport,
  getLifecycleReport,
  getDepartmentAllocationReport,
  getBookingHeatmapReport,
  exportAssetsCSV,
};
