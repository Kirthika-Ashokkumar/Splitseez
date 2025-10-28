const express = require("express");
const router = express.Router();
const {signIn, signUp} = require("../controllers/usersController");


router.route("/Users/Signup").post(signUp);
router.route("/Users/Signin").post(signIn);
// router.route("/signin").post(signUp);

module.exports = router;
