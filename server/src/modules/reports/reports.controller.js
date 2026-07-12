const reportsService = require('./reports.service');

const getUtilization = async (req, res, next) => {
  try {
    const report = await reportsService.getUtilizationReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getMaintenanceFrequency = async (req, res, next) => {
  try {
    const report = await reportsService.getMaintenanceFrequencyReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getLifecycle = async (req, res, next) => {
  try {
    const report = await reportsService.getLifecycleReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getDepartmentAllocation = async (req, res, next) => {
  try {
    const report = await reportsService.getDepartmentAllocationReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingHeatmap = async (req, res, next) => {
  try {
    const report = await reportsService.getBookingHeatmapReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const csvContent = await reportsService.exportAssetsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assetflow_report.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUtilization,
  getMaintenanceFrequency,
  getLifecycle,
  getDepartmentAllocation,
  getBookingHeatmap,
  exportReport,
};
