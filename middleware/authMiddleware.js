const jwt = require('jsonwebtoken'); // For verifying JWTs
const User = require('../models/User'); 

// Middleware to protect routes (Authentication)
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // ✅ Verify token against your secret and check expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to request
      req.user = decoded;

      

      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware for role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user object exists from 'protect' middleware and if user's role is in allowed roles
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            console.warn(`Authorization Failed: User ${req.user ? req.user.email : 'unknown'} with role ${req.user ? req.user.role : 'none'} tried to access restricted resource. Required roles: ${roles.join(', ')}`);
            return res.status(403).json({ message: `Forbidden. You do not have the required role.` });
        }
        next(); 
    };
};

// Export the middleware functions
module.exports = { protect, authorize };