const allocationService = require('./allocation.service');
const {
  createAllocationSchema,
  returnAssetSchema,
  createTransferRequestSchema,
} = require('./allocation.validation');

const getAllocations = async (req, res, next) => {
  try {
    const allocations = await allocationService.listAllocations(req.user);
    res.status(200).json({ success: true, data: { allocations } });
  } catch (error) {
    next(error);
  }
};

const getTransferRequests = async (req, res, next) => {
  try {
    const transfers = await allocationService.listTransferRequests(req.user);
    res.status(200).json({ success: true, data: { transfers } });
  } catch (error) {
    next(error);
  }
};

const allocateAsset = async (req, res, next) => {
  try {
    const parsed = createAllocationSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const allocation = await allocationService.createAllocation(parsed.data);
    res.status(201).json({
      success: true,
      data: { allocation },
    });
  } catch (error) {
    next(error);
  }
};

const returnAsset = async (req, res, next) => {
  try {
    const parsed = returnAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const allocation = await allocationService.returnAllocation(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      data: { allocation },
    });
  } catch (error) {
    next(error);
  }
};

const requestTransfer = async (req, res, next) => {
  try {
    const parsed = createTransferRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const { assetId, requestedToUserId, requestedToDepartmentId } = parsed.data;
    
    const request = await allocationService.createTransferRequest({
      assetId,
      requestedByUserId: req.user.id,
      requestedToUserId,
      requestedToDepartmentId,
    });

    res.status(201).json({
      success: true,
      data: { transferRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const approveTransfer = async (req, res, next) => {
  try {
    const request = await allocationService.approveTransferRequest(
      req.params.id,
      req.user.id,
      req.user.role,
      req.user.departmentId
    );

    res.status(200).json({
      success: true,
      data: { transferRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const rejectTransfer = async (req, res, next) => {
  try {
    const request = await allocationService.rejectTransferRequest(
      req.params.id,
      req.user.id,
      req.user.role,
      req.user.departmentId
    );

    res.status(200).json({
      success: true,
      data: { transferRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllocations,
  getTransferRequests,
  allocateAsset,
  returnAsset,
  requestTransfer,
  approveTransfer,
  rejectTransfer,
};
