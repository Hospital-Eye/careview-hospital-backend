const jwt = require('jsonwebtoken'); // For verifying JWTs
const User = require('../models/User'); 

// Middleware to protect routes (Authentication)
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found.' });
            }

            req.user = user;
            next();

        } catch (error) {
            console.error('Authentication Middleware Error:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, invalid token.' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired.' });
            }
            return res.status(401).json({ message: 'Not authorized, token validation failed.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
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