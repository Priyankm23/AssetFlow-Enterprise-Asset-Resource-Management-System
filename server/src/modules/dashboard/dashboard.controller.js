const dashboardService = require('./dashboard.service');

const getStats = async (req, res, next) => {
  try {
    const dashboardData = await dashboardService.getDashboardData();
    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const activityFeed = await dashboardService.getActivityFeed();
    res.status(200).json({
      success: true,
      data: activityFeed,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getActivity,
};
