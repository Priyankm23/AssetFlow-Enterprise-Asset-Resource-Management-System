const prisma = require('../../config/prisma');

/**
 * Report/propose a new maintenance request for an asset
 */
const createRequest = async ({ assetId, raisedByUserId, issueDescription, priority }) => {
  // Check if asset exists
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    error.code = 'ASSET_NOT_FOUND';
    throw error;
  }

  return await prisma.maintenanceRequest.create({
    data: {
      assetId,
      raisedByUserId,
      issueDescription,
      priority,
      status: 'Pending', // Defaults to Pending in DB
    },
  });
};

/**
 * Approve a proposed maintenance request
 */
const approveRequest = async (requestId, approvedByUserId) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Maintenance request not found');
    error.statusCode = 404;
    error.code = 'MAINTENANCE_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'Pending') {
    const error = new Error(`Cannot approve a maintenance request in ${request.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_REQUEST_STATE';
    throw error;
  }

  // Update in a database transaction
  const [updatedRequest] = await prisma.$transaction([
    prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'Approved',
        approvedByUserId,
      },
    }),
    prisma.asset.update({
      where: { id: request.assetId },
      data: { status: 'UnderMaintenance' }, // Asset becomes UnderMaintenance
    }),
  ]);

  return updatedRequest;
};

/**
 * Reject a proposed maintenance request
 */
const rejectRequest = async (requestId, approvedByUserId) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Maintenance request not found');
    error.statusCode = 404;
    error.code = 'MAINTENANCE_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'Pending') {
    const error = new Error(`Cannot reject a maintenance request in ${request.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_REQUEST_STATE';
    throw error;
  }

  return await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: 'Rejected',
      approvedByUserId,
    },
  });
};

/**
 * Assign a technician to an approved request
 */
const assignTechnician = async (requestId, { technicianName, scheduledDate }) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Maintenance request not found');
    error.statusCode = 404;
    error.code = 'MAINTENANCE_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'Approved') {
    const error = new Error(`Cannot assign a technician to a maintenance request in ${request.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_REQUEST_STATE';
    throw error;
  }

  return await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: 'TechnicianAssigned',
      technicianName,
    },
  });
};

/**
 * Start work on a technician assigned request
 */
const startWork = async (requestId) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Maintenance request not found');
    error.statusCode = 404;
    error.code = 'MAINTENANCE_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'TechnicianAssigned') {
    const error = new Error(`Cannot start work on a maintenance request in ${request.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_REQUEST_STATE';
    throw error;
  }

  return await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status: 'InProgress',
    },
  });
};

/**
 * Complete and resolve a maintenance request
 */
const resolveRequest = async (requestId, { resolutionNotes }) => {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Maintenance request not found');
    error.statusCode = 404;
    error.code = 'MAINTENANCE_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'InProgress') {
    const error = new Error(`Cannot resolve a maintenance request in ${request.status.toLowerCase()} state`);
    error.statusCode = 400;
    error.code = 'INVALID_REQUEST_STATE';
    throw error;
  }

  // Update request details and restore asset back to 'Available' in a transaction
  const [updatedRequest] = await prisma.$transaction([
    prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'Resolved',
        resolutionNotes,
      },
    }),
    prisma.asset.update({
      where: { id: request.assetId },
      data: { status: 'Available' }, // Reverts back to Available
    }),
  ]);

  return updatedRequest;
};

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest,
  assignTechnician,
  startWork,
  resolveRequest,
};
