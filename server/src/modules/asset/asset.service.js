const prisma = require('../../config/prisma');

/**
 * Generate the next sequential Asset Tag (e.g., AF-0001, AF-0002)
 * @returns {Promise<string>} Next asset tag
 */
const generateAssetTag = async () => {
  // Find the lexicographically highest tag
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { assetTag: 'desc' },
    select: { assetTag: true },
  });

  let nextNumber = 1;
  if (lastAsset && lastAsset.assetTag) {
    const match = lastAsset.assetTag.match(/^AF-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
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
  return await prisma.asset.create({
    data: {
      ...data,
      assetTag,
      status: 'Available', // Force default on creation
    },
  });
};

/**
 * List assets with search, filters, and pagination
 */
const listAssets = async ({ search, categoryId, status, departmentId, location, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
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
  // (Either allocated to the department directly, or allocated to a user who belongs to the department)
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
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    assets,
    pagination: {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      limit,
    },
  };
};

/**
 * Get full asset details by ID, including current holder and histories
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
  if (activeAllocation) {
    if (activeAllocation.holderUser) {
      currentHolder = {
        type: 'User',
        id: activeAllocation.holderUser.id,
        name: activeAllocation.holderUser.name,
        email: activeAllocation.holderUser.email,
        allocatedAt: activeAllocation.allocatedAt,
        expectedReturnDate: activeAllocation.expectedReturnDate,
      };
    } else if (activeAllocation.holderDepartment) {
      currentHolder = {
        type: 'Department',
        id: activeAllocation.holderDepartment.id,
        name: activeAllocation.holderDepartment.name,
        allocatedAt: activeAllocation.allocatedAt,
        expectedReturnDate: activeAllocation.expectedReturnDate,
      };
    }
  }

  // Fetch allocation history
  const allocationHistory = await prisma.allocation.findMany({
    where: { assetId: id },
    include: {
      holderUser: {
        select: { id: true, name: true, email: true },
      },
      holderDepartment: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      allocatedAt: 'desc',
    },
  });

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

  return {
    ...asset,
    currentHolder,
    allocationHistory,
    maintenanceHistory,
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

  return await prisma.asset.update({
    where: { id },
    data: cleanData,
  });
};

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
};
