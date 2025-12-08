const asyncHandler = require('express-async-handler');
const Notification = require('../models/notification');

const getNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { unreadOnly } = req.query;
  
  // Build query
  const query = { userId };
  if (unreadOnly === 'true') {
    query.read = false;
  }
  
  const notifications = await Notification.find(query)
    .populate('relatedUserId', 'name email')
    .populate('eventId', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  
  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});


const getNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findById(id)
    .populate('relatedUserId', 'name email')
    .populate('eventId', 'name')
    .populate('receiptId');
  
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Create a new notification
// @route   POST /Splitseez/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, eventId, receiptId, relatedUserId, actionUrl, metadata } = req.body;
  
  if (!userId || !type || !title || !message) {
    res.status(400);
    throw new Error('Please provide userId, type, title, and message');
  }
  
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    eventId,
    receiptId,
    relatedUserId,
    actionUrl,
    metadata,
    read: false
  });
  
  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification
  });
});


const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findById(id);
  
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  notification.read = true;
  await notification.save();
  
  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

// @desc    Mark all notifications as read for a user
// @route   PUT /Splitseez/notifications/:userId/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount
  });
});


const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findById(id);
  
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  await notification.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully'
  });
});


const deleteAllNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await Notification.deleteMany({ userId });
  
  res.status(200).json({
    success: true,
    message: 'All notifications deleted successfully',
    deletedCount: result.deletedCount
  });
});


const getUnreadCount = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const count = await Notification.countDocuments({ userId, read: false });
  
  res.status(200).json({
    success: true,
    count
  });
});

module.exports = {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
};