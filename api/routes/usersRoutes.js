const express = require("express");
const router = express.Router();
const {
  signUp,
  signIn,
  logout,
  getUserFromToken,
  getCreatedEvents,
  getParticipatingEvents
} = require("../controllers/usersController");

// Sign Up
router.route("/Users/Signup").post(signUp);
// Sign In
router.route("/Users/Signin").post(signIn);
// Logout
router.route("/Users/Logout").post(logout);
// Get current user info from token
router.route("/Users/Me").get(getUserFromToken);
// Get only created events
router.route("/Users/CreatedEvents").get(getCreatedEvents);
// Get only participating events
router.route("/Users/ParticipatingEvents").get(getParticipatingEvents);

module.exports = router;
