const jwt = require('jsonwebtoken');
const User = require('../models/user');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // No token provided
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find user by ID from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Attach user to request object for next middleware/controller
    req.user = user;
    next(); // Move to next handler (controller)
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
