const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');

const {
  createEvent,
  getEvent,
  editEvent,
  deleteEvent,
} = require('../controllers/eventController');

router.post('/Event', verifyToken, createEvent);
router.get('/Event/:id', verifyToken, getEvent);
router.put('/Event/:id', verifyToken, editEvent);
router.delete('/Event/:id', verifyToken, deleteEvent);

module.exports = router;
