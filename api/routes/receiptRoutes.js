const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../controllers/receiptController');

router.post('/Receipt', verifyToken, uploadReceipt);

module.exports = router;