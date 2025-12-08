const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
} = require('../controllers/notifController');

// Get all notifications for a user (with optional unreadOnly query param)
router.get('/notifications/:userId', verifyToken, getNotifications);

// Get unread notification count
router.get('/notifications/:userId/unread-count', verifyToken, getUnreadCount);

// Get single notification by ID
router.get('/notifications/detail/:id', verifyToken, getNotification);

// Create a new notification
router.post('/notifications', verifyToken, createNotification);

// Mark a notification as read
router.put('/notifications/:id/read', verifyToken, markAsRead);

// Mark all notifications as read for a user
router.put('/notifications/:userId/read-all', verifyToken, markAllAsRead);

// Delete a single notification
router.delete('/notifications/:id', verifyToken, deleteNotification);

// Delete all notifications for a user
router.delete('/notifications/:userId/all', verifyToken, deleteAllNotifications);

module.exports = router;