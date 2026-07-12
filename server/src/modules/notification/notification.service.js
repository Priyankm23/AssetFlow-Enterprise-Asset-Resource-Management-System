const prisma = require('../../config/prisma');

/**
 * Resolve the asset tag (entityTag) from the related entity ID
 */
const resolveAssetTag = async (type, relatedEntityId) => {
  if (!relatedEntityId) return null;
  try {
    if (type === 'AssetAssigned' || type === 'AuditDiscrepancy' || type === 'OverdueReturn') {
      const asset = await prisma.asset.findUnique({
        where: { id: relatedEntityId },
        select: { assetTag: true }
      });
      return asset ? asset.assetTag : null;
    }
    if (type === 'BookingConfirmed' || type === 'BookingCancelled' || type === 'BookingReminder') {
      const booking = await prisma.booking.findUnique({
        where: { id: relatedEntityId },
        include: { asset: { select: { assetTag: true } } }
      });
      return booking?.asset ? booking.asset.assetTag : null;
    }
    if (type === 'MaintenanceApproved' || type === 'MaintenanceRejected') {
      const req = await prisma.maintenanceRequest.findUnique({
        where: { id: relatedEntityId },
        include: { asset: { select: { assetTag: true } } }
      });
      return req?.asset ? req.asset.assetTag : null;
    }
    if (type === 'TransferApproved') {
      const transfer = await prisma.transferRequest?.findUnique({
        where: { id: relatedEntityId },
        include: { asset: { select: { assetTag: true } } }
      });
      if (transfer?.asset) return transfer.asset.assetTag;

      // Fallback: check if it's an allocation ID
      const alloc = await prisma.allocation.findUnique({
        where: { id: relatedEntityId },
        include: { asset: { select: { assetTag: true } } }
      });
      return alloc?.asset ? alloc.asset.assetTag : null;
    }
  } catch (error) {
    console.error(`[NOTIFICATION SERVICE] Failed to resolve asset tag for entity ${relatedEntityId}:`, error);
  }
  return null;
};

/**
 * Map database enum values to client types
 */
const typeMap = {
  AssetAssigned: 'assignment',
  MaintenanceApproved: 'maintenance',
  MaintenanceRejected: 'maintenance',
  BookingConfirmed: 'booking',
  BookingCancelled: 'booking',
  BookingReminder: 'booking',
  TransferApproved: 'transfer',
  OverdueReturn: 'overdue',
  AuditDiscrepancy: 'audit',
};

/**
 * Map database enum values to human-readable titles
 */
const titleMap = {
  AssetAssigned: 'Asset Assigned',
  MaintenanceApproved: 'Maintenance Request Approved',
  MaintenanceRejected: 'Maintenance Request Rejected',
  BookingConfirmed: 'Booking Confirmed',
  BookingCancelled: 'Booking Cancelled',
  BookingReminder: 'Upcoming Booking',
  TransferApproved: 'Transfer Approved',
  OverdueReturn: 'Overdue Return',
  AuditDiscrepancy: 'Audit Discrepancy Flagged',
};

/**
 * Create a new notification in the database
 */
const createNotification = async ({ userId, type, message, relatedEntityId = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        relatedEntityId,
        isRead: false,
      }
    });
    return notification;
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Error creating notification:', error);
    throw error;
  }
};

/**
 * List all notifications for a specific user
 */
const listNotifications = async (userId) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = await Promise.all(
    notifications.map(async (n) => {
      const entityTag = await resolveAssetTag(n.type, n.relatedEntityId);
      return {
        id: n.id,
        type: typeMap[n.type] || 'assignment',
        title: titleMap[n.type] || 'System Alert',
        message: n.message,
        read: n.isRead,
        createdAt: n.createdAt.toISOString(),
        entityTag: entityTag || undefined,
      };
    })
  );

  return formatted;
};

/**
 * Mark a notification as read
 */
const markAsRead = async (id, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id }
  });

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (notification.userId !== userId) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  return {
    id: updated.id,
    type: typeMap[updated.type] || 'assignment',
    title: titleMap[updated.type] || 'System Alert',
    message: updated.message,
    read: updated.isRead,
    createdAt: updated.createdAt.toISOString(),
  };
};

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
};
