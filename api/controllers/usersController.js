const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRATION = '2h';

// Sign Up
const signUp = async (req, res) => {
  try {
    let {name, email, password} = req.body ?? {};

    if (!name || !email || !password) {
      return res.status(400).json({error: 'Name, email and password are required.'});
    }

    name = name.trim();
    email = email.toLowerCase().trim();
    password = password.trim();

    const existing = await User.findOne({email});
    if (existing) {
      return res.status(409).json({error: 'A user with that email already exists.'});
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({name, email, password: hashedPassword});
    await newUser.save();

    return res.status(201).json({
      message: 'User created successfully',
      user: {name: newUser.name, email: newUser.email},
    });
  } catch (err) {
    console.error('signUp error:', err);
    return res.status(500).json({error: 'Server error'});
  }
};

// Sign In
const signIn = async (req, res) => {
  try {
    let {email, password} = req.body ?? {};

    if (!email || !password)
      return res.status(400).json({error: 'Email and password are required.'});

    email = email.toLowerCase().trim();
    password = password.trim();

    const user = await User.findOne({email});
    if (!user)
      return res.status(401).json({error: 'Invalid email or password.'});

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({error: 'Invalid email or password.'});

    const token = jwt.sign({id: user._id, email: user.email}, JWT_SECRET, {expiresIn: JWT_EXPIRATION});

    user.token = token;
    await user.save();

    return res.status(200).json({
      message: 'Sign-in successful',
      user: {name: user.name, email: user.email},
      token,
    });
  } catch (err) {
    console.error('signIn error:', err);
    return res.status(500).json({error: 'Server error'});
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({error: 'Token required.'});

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({error: 'User not found.'});

    user.token = null;
    await user.save();

    return res.status(200).json({message: 'Logout successful.'});
  } catch (err) {
    console.error('logout error:', err);
    return res.status(401).json({error: 'Invalid or expired token.'});
  }
};

// Get User by Token (full info)
const getUserFromToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({error: 'Token is required.'});

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('createdEvents', 'title date')
      .populate('participatingEvents', 'title date');

    if (!user) return res.status(404).json({error: 'User not found.'});

    const userObj = user.toObject();
    userObj.createdEventIds = user.createdEvents.map(e => e._id);
    userObj.participatingEventIds = user.participatingEvents.map(e => e._id);

    return res.status(200).json({user: userObj});
  } catch (err) {
    console.error('getUserFromToken error:', err);
    return res.status(401).json({error: 'Invalid or expired token.'});
  }
};

// Get only Created Events
const getCreatedEvents = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({error: 'Token is required.'});

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).populate('createdEvents', 'title date');
    if (!user) return res.status(404).json({error: 'User not found.'});

    return res.status(200).json({
      createdEvents: user.createdEvents,
      createdEventIds: user.createdEvents.map(e => e._id)
    });
  } catch (err) {
    console.error('getCreatedEvents error:', err);
    return res.status(401).json({error: 'Invalid or expired token.'});
  }
};

// Get only Participating Events
const getParticipatingEvents = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({error: 'Token is required.'});

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).populate('participatingEvents', 'title date');
    if (!user) return res.status(404).json({error: 'User not found.'});

    return res.status(200).json({
      participatingEvents: user.participatingEvents,
      participatingEventIds: user.participatingEvents.map(e => e._id)
    });
  } catch (err) {
    console.error('getParticipatingEvents error:', err);
    return res.status(401).json({error: 'Invalid or expired token.'});
  }
};

module.exports = {
  signUp,
  signIn,
  logout,
  getUserFromToken,
  getCreatedEvents,
  getParticipatingEvents
};
