const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Auth Middleware: Decoded user:', JSON.stringify(decoded));
    next();
  } catch (err) {
    console.warn('Auth Middleware: Invalid token:', err.message);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
