const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
  token = req.headers.authorization.split(' ')[1];
  console.log('Extracted token:', token);
   }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Decoded JWT:', decoded);

const user = await User.findById(decoded.id).select('-password');
console.log('Fetched user:', user); // Exclude password

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = user; // Attach user details to request
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
