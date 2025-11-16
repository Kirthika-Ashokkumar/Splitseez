const express = require("express");
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  signUp,
  signIn,
  logout,
  getUserFromToken,
  getCreatedEvents,
  getParticipatingEvents,
  validateUsersByEmails
} = require("../controllers/usersController");

// Sign Up (no auth needed)
router.post("/Users/Signup", signUp);
// Sign In (no auth needed)
router.post("/Users/Signin", signIn);
// Logout (needs auth)
router.post("/Users/Logout", verifyToken, logout);
// Get current user info from token (needs auth)
router.get("/Users/Me", verifyToken, getUserFromToken);
// Get only created events (needs auth)
router.get("/Users/CreatedEvents", verifyToken, getCreatedEvents);
// Get only participating events (needs auth)
router.get("/Users/ParticipatingEvents", verifyToken, getParticipatingEvents);
// Validate users by emails (needs auth)
router.post("/Users/ValidateEmails", verifyToken, validateUsersByEmails);

module.exports = router;