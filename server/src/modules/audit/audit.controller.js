const auditService = require('./audit.service');
const { createAuditCycleSchema, updateAuditItemSchema } = require('./audit.validation');

const getAuditCycles = async (req, res, next) => {
  try {
    const cycles = await auditService.listAuditCycles();
    res.status(200).json({
      success: true,
      data: { auditCycles: cycles },
    });
  } catch (error) {
    next(error);
  }
};

const createAuditCycle = async (req, res, next) => {
  try {
    const parsed = createAuditCycleSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const cycle = await auditService.createAuditCycle({
      ...parsed.data,
      createdByUserId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: { auditCycle: cycle },
    });
  } catch (error) {
    next(error);
  }
};

const startAuditCycle = async (req, res, next) => {
  try {
    const cycle = await auditService.startAuditCycle(req.params.id);
    res.status(200).json({
      success: true,
      data: { auditCycle: cycle },
    });
  } catch (error) {
    next(error);
  }
};

const closeAuditCycle = async (req, res, next) => {
  try {
    const cycle = await auditService.closeAuditCycle(req.params.id);
    res.status(200).json({
      success: true,
      data: { auditCycle: cycle },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditItems = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    if (!cycleId) {
      const error = new Error('cycleId query parameter is required');
      error.statusCode = 400;
      error.code = 'MISSING_CYCLE_ID';
      return next(error);
    }

    const items = await auditService.listAuditItems(cycleId);
    res.status(200).json({
      success: true,
      data: { auditItems: items },
    });
  } catch (error) {
    next(error);
  }
};

const updateAuditItem = async (req, res, next) => {
  try {
    const parsed = updateAuditItemSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const item = await auditService.updateAuditItem(
      req.params.id,
      parsed.data,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: { auditItem: item },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditCycles,
  createAuditCycle,
  startAuditCycle,
  closeAuditCycle,
  getAuditItems,
  updateAuditItem,
};
