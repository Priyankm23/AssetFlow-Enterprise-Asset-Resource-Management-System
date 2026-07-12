const maintenanceService = require('./maintenance.service');
const {
  createRequestSchema,
  assignTechnicianSchema,
  resolveRequestSchema,
} = require('./maintenance.validation');

const createRequest = async (req, res, next) => {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const { assetId, issueDescription, priority } = parsed.data;

    const request = await maintenanceService.createRequest({
      assetId,
      raisedByUserId: req.user.id,
      issueDescription,
      priority,
    });

    res.status(201).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const approveRequest = async (req, res, next) => {
  try {
    const request = await maintenanceService.approveRequest(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const request = await maintenanceService.rejectRequest(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const assignRequest = async (req, res, next) => {
  try {
    const parsed = assignTechnicianSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const request = await maintenanceService.assignTechnician(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const startRequest = async (req, res, next) => {
  try {
    const request = await maintenanceService.startWork(req.params.id);
    res.status(200).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const resolveRequest = async (req, res, next) => {
  try {
    const parsed = resolveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const request = await maintenanceService.resolveRequest(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      data: { maintenanceRequest: request },
    });
  } catch (error) {
    next(error);
  }
};

const getMaintenanceRequests = async (req, res, next) => {
  try {
    const requests = await maintenanceService.listRequests(req.user);
    res.status(200).json({
      success: true,
      data: { maintenanceRequests: requests },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest,
  assignRequest,
  startRequest,
  resolveRequest,
  getMaintenanceRequests,
};
