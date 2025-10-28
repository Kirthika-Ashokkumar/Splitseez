const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');


const PHONE_KEY_BASE64 =
    process.env.PHONE_ENC_KEY || ''; 
let PHONE_KEY_BUFFER = null;
if (PHONE_KEY_BASE64) {
  PHONE_KEY_BUFFER = Buffer.from(PHONE_KEY_BASE64, 'base64');
  if (PHONE_KEY_BUFFER.length !== 32) {
    console.warn(
        'PHONE_ENC_KEY is not 32 bytes after base64 decode — phone encryption will not be used.');
    PHONE_KEY_BUFFER = null;
  }
}

// AES-GCM encryption helpers (reversible)
function encryptPhone(plainText) {
  if (!PHONE_KEY_BUFFER) return null;
  // Generate a random 12-byte IV
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', PHONE_KEY_BUFFER, iv);
  const encrypted =
      Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptPhone(encBase64) {
  if (!PHONE_KEY_BUFFER) return null;
  const data = Buffer.from(encBase64, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', PHONE_KEY_BUFFER, iv);
  decipher.setAuthTag(tag);
  const decrypted =
      Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}


const signUp = async (req, res) => {
  try {
    let {name, email, password, phone} = req.body ?? {};

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json(
          {error: 'Name, email and password are required.'});
    }

    // Normalize email (simple)
    name = name.trim();
    email = email.toLowerCase().trim();
    password = password.trim();


    // Check if user already exists with same email
    const existing = await User.findOne({email});
    if (existing) {
      return res.status(409).json(
          {error: 'A user with that email already exists.'});
    }

    if (phone) {
      const phoneNormalized = phone.replace(/\D/g, ''); 
      const phoneHash =
          crypto.createHash('sha256').update(phoneNormalized).digest('hex');
      const existingPhone = await User.findOne({phoneHash});
      if (existingPhone) {
        return res.status(409).json(
            {error: 'A user with that phone number already exists.'});
      }

      req.body._phoneHash = phoneHash;
    }

    // Hash the password with bcrypt (recommended)
    const saltRounds = 12;  // 10-12 is common. higher = slower but stronger.
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let encryptedPhone = null;
    let phoneHashToSave = req.body._phoneHash || null;
    if (phone) {
      const phoneNormalized = phone.trim();
      encryptedPhone =
          PHONE_KEY_BUFFER ? encryptPhone(phoneNormalized) : phoneNormalized;
    }

    // Create user object and save
    const newUser = new User({
      name,
      email,
      password: hashedPassword,   
      phone: encryptedPhone,     
      phoneHash: phoneHashToSave 
    });

    await newUser.save();

    // Return safe response (do NOT include hashed password or raw phone)
    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
      }
    });
  } catch (err) {
    console.error('signIn error:', err);
    return res.status(500).json({error: 'Server error'});
  }
};

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

    return res.status(200).json({
      message: 'Sign-in successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error('signIn error:', err);
    return res.status(500).json({error: 'Server error'});
  }
};

module.exports = {
  signIn,
  signUp,
  encryptPhone,
  decryptPhone
};
