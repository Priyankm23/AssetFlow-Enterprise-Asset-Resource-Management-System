const notificationService = require('./notification.service');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.listNotifications(req.user.id);
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
};
