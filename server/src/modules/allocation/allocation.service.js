const prisma = require('../../config/prisma');

/**
 * Allocate an asset to a user or department
 */
const createAllocation = async ({ assetId, holderUserId, holderDepartmentId, expectedReturnDate }) => {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    error.code = 'ASSET_NOT_FOUND';
    throw error;
  }

  // Check if asset is already allocated
  const activeAllocation = await prisma.allocation.findFirst({
    where: {
      assetId,
      status: 'Active',
    },
    include: {
      holderUser: {
        select: { id: true, name: true, email: true },
      },
      holderDepartment: {
        select: { id: true, name: true },
      },
    },
  });

  if (activeAllocation) {
    const holderName = activeAllocation.holderUser
      ? activeAllocation.holderUser.name
      : activeAllocation.holderDepartment.name;

    const error = new Error(`Currently held by ${holderName}`);
    error.statusCode = 409;
    error.code = 'ASSET_ALREADY_ALLOCATED';
    error.currentHolder = activeAllocation.holderUser
      ? {
          type: 'User',
          id: activeAllocation.holderUser.id,
          name: activeAllocation.holderUser.name,
          email: activeAllocation.holderUser.email,
        }
      : {
          type: 'Department',
          id: activeAllocation.holderDepartment.id,
          name: activeAllocation.holderDepartment.name,
        };
    throw error;
  }

  // Verify holder user exists
  if (holderUserId) {
    const user = await prisma.user.findUnique({ where: { id: holderUserId } });
    if (!user) {
      const error = new Error('Holder user not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
  }

  // Verify holder department exists
  if (holderDepartmentId) {
    const dept = await prisma.department.findUnique({ where: { id: holderDepartmentId } });
    if (!dept) {
      const error = new Error('Holder department not found');
      error.statusCode = 404;
      error.code = 'DEPT_NOT_FOUND';
      throw error;
    }
  }

  // Perform allocation in a database transaction
  const [allocation] = await prisma.$transaction([
    prisma.allocation.create({
      data: {
        assetId,
        holderUserId: holderUserId || null,
        holderDepartmentId: holderDepartmentId || null,
        expectedReturnDate: expectedReturnDate || null,
        status: 'Active',
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: 'Allocated' },
    }),
  ]);

  return allocation;
};

/**
 * Return an allocated asset
 */
const returnAllocation = async (allocationId, { returnConditionNotes }) => {
  const allocation = await prisma.allocation.findUnique({
    where: { id: allocationId },
  });

  if (!allocation) {
    const error = new Error('Allocation record not found');
    error.statusCode = 404;
    error.code = 'ALLOCATION_NOT_FOUND';
    throw error;
  }

  if (allocation.status === 'Returned') {
    const error = new Error('Asset has already been returned');
    error.statusCode = 400;
    error.code = 'ASSET_ALREADY_RETURNED';
    throw error;
  }

  const [updatedAllocation] = await prisma.$transaction([
    prisma.allocation.update({
      where: { id: allocationId },
      data: {
        status: 'Returned',
        actualReturnDate: new Date(),
        returnConditionNotes: returnConditionNotes || null,
      },
    }),
    prisma.asset.update({
      where: { id: allocation.assetId },
      data: { status: 'Available' },
    }),
  ]);

  return updatedAllocation;
};

/**
 * Create a transfer request
 */
const createTransferRequest = async ({ assetId, requestedByUserId, requestedToUserId, requestedToDepartmentId }) => {
  // Check if asset has an active allocation
  const activeAllocation = await prisma.allocation.findFirst({
    where: {
      assetId,
      status: 'Active',
    },
  });

  if (!activeAllocation) {
    const error = new Error('Cannot request transfer for an unallocated asset');
    error.statusCode = 400;
    error.code = 'ASSET_NOT_ALLOCATED';
    throw error;
  }

  // Verify target user exists
  if (requestedToUserId) {
    const user = await prisma.user.findUnique({ where: { id: requestedToUserId } });
    if (!user) {
      const error = new Error('Requested target user not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
  }

  // Verify target department exists
  if (requestedToDepartmentId) {
    const dept = await prisma.department.findUnique({ where: { id: requestedToDepartmentId } });
    if (!dept) {
      const error = new Error('Requested target department not found');
      error.statusCode = 404;
      error.code = 'DEPT_NOT_FOUND';
      throw error;
    }
  }

  return await prisma.transferRequest.create({
    data: {
      assetId,
      currentAllocationId: activeAllocation.id,
      requestedByUserId,
      requestedToUserId: requestedToUserId || null,
      requestedToDepartmentId: requestedToDepartmentId || null,
      status: 'Requested',
    },
  });
};

/**
 * Helper to validate if a user has authority to approve/reject a transfer request
 */
const checkTransferAuthorization = async (transferRequest, approvedByUserId, userRole, userDeptId) => {
  if (userRole === 'AssetManager') {
    return true; // AssetManager has global authority
  }

  if (userRole === 'DepartmentHead') {
    // Determine the department of the current holder
    const currentAllocation = await prisma.allocation.findUnique({
      where: { id: transferRequest.currentAllocationId },
      include: {
        holderUser: { select: { departmentId: true } },
      },
    });

    if (currentAllocation) {
      const currentDeptId = currentAllocation.holderDepartmentId || currentAllocation.holderUser?.departmentId;
      if (currentDeptId === userDeptId) {
        return true; // Authorized HOD
      }
    }
  }

  const error = new Error('You do not have permission to approve/reject this transfer');
  error.statusCode = 403;
  error.code = 'FORBIDDEN_TRANSFER_ACTION';
  throw error;
};

/**
 * Approve a transfer request
 */
const approveTransferRequest = async (requestId, approvedByUserId, userRole, userDeptId) => {
  const request = await prisma.transferRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Transfer request not found');
    error.statusCode = 404;
    error.code = 'TRANSFER_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'Requested') {
    const error = new Error(`Transfer request is already ${request.status.toLowerCase()}`);
    error.statusCode = 400;
    error.code = 'TRANSFER_ALREADY_PROCESSED';
    throw error;
  }

  // Validate authorization
  await checkTransferAuthorization(request, approvedByUserId, userRole, userDeptId);

  // Perform handovers in a transaction
  const [updatedRequest] = await prisma.$transaction([
    // Update TransferRequest status
    prisma.transferRequest.update({
      where: { id: requestId },
      data: {
        status: 'ReAllocated',
        approvedByUserId,
      },
    }),
    // Close old allocation
    prisma.allocation.update({
      where: { id: request.currentAllocationId },
      data: {
        status: 'Returned',
        actualReturnDate: new Date(),
        returnConditionNotes: 'Returned via approved Transfer Request',
      },
    }),
    // Create new allocation
    prisma.allocation.create({
      data: {
        assetId: request.assetId,
        holderUserId: request.requestedToUserId,
        holderDepartmentId: request.requestedToDepartmentId,
        status: 'Active',
      },
    }),
  ]);

  return updatedRequest;
};

/**
 * Reject a transfer request
 */
const rejectTransferRequest = async (requestId, approvedByUserId, userRole, userDeptId) => {
  const request = await prisma.transferRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const error = new Error('Transfer request not found');
    error.statusCode = 404;
    error.code = 'TRANSFER_REQUEST_NOT_FOUND';
    throw error;
  }

  if (request.status !== 'Requested') {
    const error = new Error(`Transfer request is already ${request.status.toLowerCase()}`);
    error.statusCode = 400;
    error.code = 'TRANSFER_ALREADY_PROCESSED';
    throw error;
  }

  // Validate authorization
  await checkTransferAuthorization(request, approvedByUserId, userRole, userDeptId);

  return await prisma.transferRequest.update({
    where: { id: requestId },
    data: {
      status: 'Rejected',
      approvedByUserId,
    },
  });
};

module.exports = {
  createAllocation,
  returnAllocation,
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
};
