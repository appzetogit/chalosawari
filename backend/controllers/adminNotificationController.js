const Notification = require('../models/Notification');
const User = require('../models/User');
const Driver = require('../models/Driver');

/**
 * @desc    Send a notification to users, drivers, or all
 * @route   POST /api/admin/notifications
 * @access  Private (Admin)
 */
exports.sendNotification = async (req, res) => {
  try {
    const { title, description, targetAudience } = req.body;

    if (!title || !description || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and target audience are required'
      });
    }

    if (!['user', 'driver', 'all'].includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Target audience must be user, driver, or all'
      });
    }

    // Calculate recipient count
    let recipientCount = 0;
    try {
      if (targetAudience === 'user') {
        recipientCount = await User.countDocuments();
      } else if (targetAudience === 'driver') {
        recipientCount = await Driver.countDocuments();
      } else if (targetAudience === 'all') {
        const [userCount, driverCount] = await Promise.all([
          User.countDocuments(),
          Driver.countDocuments()
        ]);
        recipientCount = userCount + driverCount;
      }
    } catch (countErr) {
      console.warn('Could not count recipients, defaulting to 0:', countErr.message);
    }

    const notification = await Notification.create({
      title: title.trim(),
      description: description.trim(),
      targetAudience,
      sentBy: req.admin?._id || req.user?._id,
      recipientCount,
      status: 'sent'
    });

    res.status(201).json({
      success: true,
      message: `Notification sent successfully to ${targetAudience === 'all' ? 'all users and drivers' : targetAudience + 's'}`,
      data: notification
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification: ' + error.message
    });
  }
};

/**
 * @desc    Get all sent notifications
 * @route   GET /api/admin/notifications
 * @access  Private (Admin)
 */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, targetAudience } = req.query;
    const filter = {};

    if (targetAudience && ['user', 'driver', 'all'].includes(targetAudience)) {
      filter.targetAudience = targetAudience;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('sentBy', 'name email'),
      Notification.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications: ' + error.message
    });
  }
};

/**
 * @desc    Delete a notification by ID
 * @route   DELETE /api/admin/notifications/:id
 * @access  Private (Admin)
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification: ' + error.message
    });
  }
};

