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

// IMPORTANT: Specific routes MUST come BEFORE generic /:param routes

// Create a new notification
router.post('/notifications', verifyToken, createNotification);

// Get single notification by ID (put specific paths first)
router.get('/notifications/detail/:id', verifyToken, getNotification);

// Get unread notification count (specific path before generic :userId)
router.get('/notifications/:userId/unread-count', verifyToken, getUnreadCount);

// Mark all notifications as read for a user
router.put('/notifications/:userId/read-all', verifyToken, markAllAsRead);

// Delete all notifications for a user
router.delete('/notifications/:userId/all', verifyToken, deleteAllNotifications);

// Mark a notification as read
router.put('/notifications/:id/read', verifyToken, markAsRead);

// Delete a single notification
router.delete('/notifications/:id', verifyToken, deleteNotification);

// Get all notifications for a user (this should be LAST because it's most generic)
router.get('/notifications/:userId', verifyToken, getNotifications);

module.exports = router;