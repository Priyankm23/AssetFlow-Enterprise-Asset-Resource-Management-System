const prisma = require('../../config/prisma');

/**
 * List all audit cycles with auditor names and department details
 */
const listAuditCycles = async () => {
  const cycles = await prisma.auditCycle.findMany({
    include: {
      scopeDepartment: { select: { id: true, name: true } },
      auditors: {
        include: {
          auditorUser: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusMap = {
    Planned: 'planned',
    InProgress: 'in_progress',
    Closed: 'closed'
  };

  return cycles.map((c) => ({
    id: c.id,
    scopeDepartmentId: c.scopeDepartmentId,
    scopeDepartmentName: c.scopeDepartment?.name ?? null,
    scopeLocation: c.scopeLocation,
    startDate: c.startDate.toISOString().split('T')[0],
    endDate: c.endDate.toISOString().split('T')[0],
    status: statusMap[c.status] || c.status.toLowerCase(),
    auditorUserIds: c.auditors.map((a) => a.auditorUserId),
    auditorNames: c.auditors.map((a) => a.auditorUser?.name).filter(Boolean),
  }));
};

/**
 * Create a new audit cycle, resolve scoped assets, and initialize checklist items
 */
const createAuditCycle = async ({ scopeDepartmentId, scopeLocation, startDate, endDate, auditorUserIds, createdByUserId }) => {
  // 1. Resolve matching assets based on department scope or location scope
  const whereClause = {};

  if (scopeLocation) {
    whereClause.location = { contains: scopeLocation, mode: 'insensitive' };
  }

  if (scopeDepartmentId) {
    whereClause.allocations = {
      some: {
        status: 'Active',
        OR: [
          { holderDepartmentId: scopeDepartmentId },
          { holderUser: { departmentId: scopeDepartmentId } }
        ]
      }
    };
  }

  const matchedAssets = await prisma.asset.findMany({
    where: whereClause,
    select: { id: true }
  });

  if (matchedAssets.length === 0) {
    const error = new Error('No assets match the specified scope/location');
    error.statusCode = 400;
    error.code = 'NO_ASSETS_IN_SCOPE';
    throw error;
  }

  // 2. Perform creations inside a database transaction
  const cycle = await prisma.$transaction(async (tx) => {
    // Create Audit Cycle
    const newCycle = await tx.auditCycle.create({
      data: {
        scopeDepartmentId: scopeDepartmentId || null,
        scopeLocation: scopeLocation || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'Planned',
        createdByUserId,
      }
    });

    // Create auditor links (default to the creator if none specified)
    const finalAuditorIds = auditorUserIds && auditorUserIds.length > 0 ? auditorUserIds : [createdByUserId];
    await tx.auditCycleAuditor.createMany({
      data: finalAuditorIds.map((userId) => ({
        auditCycleId: newCycle.id,
        auditorUserId: userId
      }))
    });

    // Initialize AuditItems
    await tx.auditItem.createMany({
      data: matchedAssets.map((asset) => ({
        auditCycleId: newCycle.id,
        assetId: asset.id,
        result: 'Pending',
      }))
    });

    return newCycle;
  });

  return cycle;
};

/**
 * Start a planned audit cycle
 */
const startAuditCycle = async (id) => {
  const cycle = await prisma.auditCycle.findUnique({ where: { id } });
  if (!cycle) {
    const error = new Error('Audit cycle not found');
    error.statusCode = 404;
    error.code = 'AUDIT_CYCLE_NOT_FOUND';
    throw error;
  }

  if (cycle.status !== 'Planned') {
    const error = new Error(`Cannot start an audit cycle in ${cycle.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_CYCLE_STATE';
    throw error;
  }

  return await prisma.auditCycle.update({
    where: { id },
    data: { status: 'InProgress' }
  });
};

/**
 * Close and lock an active audit cycle
 */
const closeAuditCycle = async (id) => {
  const cycle = await prisma.auditCycle.findUnique({ where: { id } });
  if (!cycle) {
    const error = new Error('Audit cycle not found');
    error.statusCode = 404;
    error.code = 'AUDIT_CYCLE_NOT_FOUND';
    throw error;
  }

  if (cycle.status !== 'InProgress') {
    const error = new Error(`Cannot close an audit cycle in ${cycle.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_CYCLE_STATE';
    throw error;
  }

  return await prisma.auditCycle.update({
    where: { id },
    data: { status: 'Closed' }
  });
};

/**
 * List all verification items for a specific audit cycle
 */
const listAuditItems = async (auditCycleId) => {
  const items = await prisma.auditItem.findMany({
    where: { auditCycleId },
    include: {
      asset: { select: { id: true, name: true, assetTag: true, location: true } },
      checkedByUser: { select: { id: true, name: true } },
    },
    orderBy: { asset: { assetTag: 'asc' } },
  });

  return items.map((i) => ({
    id: i.id,
    auditCycleId: i.auditCycleId,
    assetId: i.assetId,
    assetTag: i.asset?.assetTag ?? '',
    assetName: i.asset?.name ?? '',
    expectedLocation: i.asset?.location ?? '—',
    checkedByUserId: i.checkedByUserId,
    checkedByUserName: i.checkedByUser?.name ?? null,
    result: i.result,
    notes: i.notes,
  }));
};

/**
 * Verify / update status of an individual asset audit item
 */
const updateAuditItem = async (itemId, { result, notes }, checkedByUserId) => {
  const item = await prisma.auditItem.findUnique({
    where: { id: itemId },
    include: { auditCycle: { select: { status: true } } }
  });

  if (!item) {
    const error = new Error('Audit item not found');
    error.statusCode = 404;
    error.code = 'AUDIT_ITEM_NOT_FOUND';
    throw error;
  }

  if (item.auditCycle.status !== 'InProgress') {
    const error = new Error('Verification changes are only allowed while the cycle is active (In Progress)');
    error.statusCode = 400;
    error.code = 'AUDIT_CYCLE_LOCKED';
    throw error;
  }

  const updatedItem = await prisma.auditItem.update({
    where: { id: itemId },
    data: {
      result,
      notes: notes || null,
      checkedByUserId,
    },
    include: {
      asset: {
        include: {
          allocations: {
            where: { status: 'Active' },
            include: { holderUser: true }
          }
        }
      }
    }
  });

  // Trigger Notification
  if (result === 'Missing' || result === 'Damaged') {
    const notificationService = require('../notification/notification.service');
    const asset = updatedItem.asset;
    const activeAlloc = asset.allocations[0];
    
    // Notify the user currently holding the asset (if any)
    if (activeAlloc?.holderUserId) {
      await notificationService.createNotification({
        userId: activeAlloc.holderUserId,
        type: 'AuditDiscrepancy',
        message: `Asset ${asset.name} (${asset.assetTag}) in your possession has been flagged as ${result.toLowerCase()} during an audit.`,
        relatedEntityId: asset.id,
      }).catch(err => console.error('[NOTIFICATION CREATE ERROR]', err));
    }

    // Also notify the HOD of the department (if any)
    const deptId = activeAlloc?.holderDepartmentId || activeAlloc?.holderUser?.departmentId;
    if (deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        select: { headUserId: true }
      });
      if (dept?.headUserId && dept.headUserId !== activeAlloc?.holderUserId) {
        await notificationService.createNotification({
          userId: dept.headUserId,
          type: 'AuditDiscrepancy',
          message: `Asset ${asset.name} (${asset.assetTag}) belonging to your department has been flagged as ${result.toLowerCase()} during an audit.`,
          relatedEntityId: asset.id,
        }).catch(err => console.error('[NOTIFICATION CREATE ERROR]', err));
      }
    }
  }

  // Map to clean response
  return {
    id: updatedItem.id,
    auditCycleId: updatedItem.auditCycleId,
    assetId: updatedItem.assetId,
    checkedByUserId: updatedItem.checkedByUserId,
    result: updatedItem.result,
    notes: updatedItem.notes,
    createdAt: updatedItem.createdAt,
    updatedAt: updatedItem.updatedAt,
  };
};

module.exports = {
  listAuditCycles,
  createAuditCycle,
  startAuditCycle,
  closeAuditCycle,
  listAuditItems,
  updateAuditItem,
};
