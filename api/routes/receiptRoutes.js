const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  uploadReceipt,
  updateReceipt,
  deleteReceipt,
  getReceipt,
  getOwedList
} = require('../controllers/receiptController');

// Create a new receipt
router.post('/Receipt', verifyToken, uploadReceipt);
// Update an existing receipt
router.put('/Receipt/:receiptId', verifyToken, updateReceipt);
// Delete a receipt
router.delete('/Receipt/:receiptId', verifyToken, deleteReceipt);
// Get a receipt (all fields, with event date and user names)
router.get('/Receipt/:receiptId', verifyToken, getReceipt);
// Get only the owed list with user names
router.get('/Receipt/:receiptId/owed', verifyToken, getOwedList);

module.exports = router;

