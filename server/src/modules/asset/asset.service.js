const prisma = require('../../config/prisma');

/**
 * Generate a sequential Asset Tag (AF-XXXX)
 */
const generateAssetTag = async () => {
  const lastAsset = await prisma.asset.findFirst({
    orderBy: {
      assetTag: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastAsset && lastAsset.assetTag) {
    const lastTagNum = parseInt(lastAsset.assetTag.replace('AF-', ''), 10);
    if (!isNaN(lastTagNum)) {
      nextNumber = lastTagNum + 1;
    }
  }

  // Format as AF-XXXX (e.g. AF-0001)
  return `AF-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Create a new asset
 */
const createAsset = async (data) => {
  // Verify category exists
  const category = await prisma.assetCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    const error = new Error('Asset category not found');
    error.statusCode = 404;
    error.code = 'CATEGORY_NOT_FOUND';
    throw error;
  }

  // Generate tag
  const assetTag = await generateAssetTag();

  // Force default status as 'Available'
  const asset = await prisma.asset.create({
    data: {
      ...data,
      assetTag,
      status: 'Available', // Force default on creation
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    id: asset.id,
    tag: asset.assetTag,
    name: asset.name,
    categoryId: asset.categoryId,
    categoryName: asset.category ? asset.category.name : 'Unknown',
    serialNumber: asset.serialNumber,
    acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.toISOString().split('T')[0] : null,
    acquisitionCost: asset.acquisitionCost,
    condition: asset.condition,
    status: asset.status,
    location: asset.location,
    isBookable: asset.isBookable,
    departmentId: null,
    departmentName: null,
    currentHolder: null,
  };
};

/**
 * List assets with search, filters, and optional pagination
 */
const listAssets = async ({ search, categoryId, status, departmentId, location, page, limit }) => {
  const skip = page && limit ? (page - 1) * limit : undefined;
  const take = page && limit ? limit : undefined;
  const where = {};

  // Text search on assetTag, serialNumber, or name
  if (search) {
    const trimmedSearch = search.trim();
    where.OR = [
      { assetTag: { contains: trimmedSearch, mode: 'insensitive' } },
      { name: { contains: trimmedSearch, mode: 'insensitive' } },
      { serialNumber: { contains: trimmedSearch, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  if (location) {
    where.location = { contains: location.trim(), mode: 'insensitive' };
  }

  // Filter assets currently allocated to a specific department
  if (departmentId) {
    where.allocations = {
      some: {
        status: 'Active',
        OR: [
          { holderDepartmentId: departmentId },
          {
            holderUser: {
              departmentId: departmentId,
            },
          },
        ],
      },
    };
  }

  // Query database
  const [assets, totalItems] = await prisma.$transaction([
    prisma.asset.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        allocations: {
          where: { status: 'Active' },
          include: {
            holderUser: {
              select: {
                id: true,
                name: true,
                department: { select: { id: true, name: true } },
              },
            },
            holderDepartment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.asset.count({ where }),
  ]);

  const formattedAssets = assets.map((asset) => {
    const activeAlloc = asset.allocations[0] || null;
    let deptId = null;
    let deptName = null;
    let currentHolder = null;

    if (activeAlloc) {
      if (activeAlloc.holderUser) {
        deptId = activeAlloc.holderUser.department?.id || null;
        deptName = activeAlloc.holderUser.department?.name || null;
        currentHolder = {
          userId: activeAlloc.holderUser.id,
          userName: activeAlloc.holderUser.name,
          departmentName: deptName || 'Unknown',
        };
      } else if (activeAlloc.holderDepartment) {
        deptId = activeAlloc.holderDepartment.id;
        deptName = activeAlloc.holderDepartment.name;
        currentHolder = {
          userId: '',
          userName: 'Department',
          departmentName: deptName,
        };
      }
    }

    return {
      id: asset.id,
      tag: asset.assetTag,
      name: asset.name,
      categoryId: asset.categoryId,
      categoryName: asset.category ? asset.category.name : 'Unknown',
      serialNumber: asset.serialNumber,
      acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.toISOString().split('T')[0] : null,
      acquisitionCost: asset.acquisitionCost,
      condition: asset.condition,
      status: asset.status,
      location: asset.location,
      isBookable: asset.isBookable,
      departmentId: deptId,
      departmentName: deptName,
      currentHolder,
    };
  });

  return {
    assets: formattedAssets,
    totalItems,
    totalPages: limit ? Math.ceil(totalItems / limit) : 1,
    currentPage: page || 1,
  };
};

/**
 * Get full asset details by ID, including current holder and histories formatted for frontend
 */
const getAssetById = async (id) => {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    error.code = 'ASSET_NOT_FOUND';
    throw error;
  }

  // Resolve current holder (Active allocation)
  const activeAllocation = await prisma.allocation.findFirst({
    where: {
      assetId: id,
      status: 'Active',
    },
    include: {
      holderUser: {
        select: {
          id: true,
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      holderDepartment: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  let currentHolder = null;
  let departmentId = null;
  let departmentName = null;

  if (activeAllocation) {
    if (activeAllocation.holderUser) {
      departmentName = activeAllocation.holderUser.department?.name || null;
      currentHolder = {
        userId: activeAllocation.holderUser.id,
        userName: activeAllocation.holderUser.name,
        departmentName: departmentName || 'Unknown',
      };
    } else if (activeAllocation.holderDepartment) {
      departmentId = activeAllocation.holderDepartment.id;
      departmentName = activeAllocation.holderDepartment.name;
      currentHolder = {
        userId: '',
        userName: 'Department',
        departmentName: departmentName,
      };
    }
  }

  // Fetch allocation history
  const allocationHistory = await prisma.allocation.findMany({
    where: { assetId: id },
    include: {
      holderUser: {
        select: {
          id: true,
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      holderDepartment: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      allocatedAt: 'desc',
    },
  });

  const formattedAllocHistory = allocationHistory.map((al) => ({
    id: al.id,
    assetId: al.assetId,
    assetTag: asset.assetTag,
    assetName: asset.name,
    holderUserId: al.holderUserId,
    holderUserName: al.holderUser ? al.holderUser.name : (al.holderDepartment ? al.holderDepartment.name : 'Unknown'),
    holderDepartmentId: al.holderDepartmentId,
    holderDepartmentName: al.holderDepartment ? al.holderDepartment.name : (al.holderUser?.department?.name || ''),
    allocatedAt: al.allocatedAt.toISOString(),
    returnedAt: al.actualReturnDate ? al.actualReturnDate.toISOString() : null,
    returnConditionNotes: al.returnConditionNotes,
    status: al.status.toLowerCase(), // 'active' | 'returned' | 'overdue'
  }));

  // Fetch maintenance history
  const maintenanceHistory = await prisma.maintenanceRequest.findMany({
    where: { assetId: id },
    include: {
      raisedByUser: {
        select: { id: true, name: true },
      },
      approvedByUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedMaintHistory = maintenanceHistory.map((m) => ({
    id: m.id,
    assetId: m.assetId,
    assetTag: asset.assetTag,
    issueDescription: m.issueDescription,
    priority: m.priority,
    status: m.status === 'InProgress' ? 'In Progress' : (m.status === 'TechnicianAssigned' ? 'Technician Assigned' : m.status),
    createdAt: m.createdAt.toISOString(),
    resolutionNotes: m.resolutionNotes,
  }));

  return {
    id: asset.id,
    tag: asset.assetTag,
    name: asset.name,
    categoryId: asset.categoryId,
    categoryName: asset.category ? asset.category.name : 'Unknown',
    serialNumber: asset.serialNumber,
    acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.toISOString().split('T')[0] : null,
    acquisitionCost: asset.acquisitionCost,
    condition: asset.condition,
    status: asset.status,
    location: asset.location,
    isBookable: asset.isBookable,
    departmentId,
    departmentName,
    currentHolder,
    allocationHistory: formattedAllocHistory,
    maintenanceHistory: formattedMaintHistory,
  };
};

/**
 * Update an asset
 */
const updateAsset = async (id, updateData) => {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    error.code = 'ASSET_NOT_FOUND';
    throw error;
  }

  // Verify category if categoryId is updated
  if (updateData.categoryId) {
    const category = await prisma.assetCategory.findUnique({
      where: { id: updateData.categoryId },
    });
    if (!category) {
      const error = new Error('Asset category not found');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
  }

  // Clean data to prevent modifying assetTag or status directly
  const { assetTag, status, ...cleanData } = updateData;

  const updated = await prisma.asset.update({
    where: { id },
    data: cleanData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    tag: updated.assetTag,
    name: updated.name,
    categoryId: updated.categoryId,
    categoryName: updated.category ? updated.category.name : 'Unknown',
    serialNumber: updated.serialNumber,
    acquisitionDate: updated.acquisitionDate ? updated.acquisitionDate.toISOString().split('T')[0] : null,
    acquisitionCost: updated.acquisitionCost,
    condition: updated.condition,
    status: updated.status,
    location: updated.location,
    isBookable: updated.isBookable,
    departmentId: null,
    departmentName: null,
    currentHolder: null,
  };
};

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
};
