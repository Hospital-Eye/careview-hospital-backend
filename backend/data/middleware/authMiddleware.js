const jwt = require('jsonwebtoken'); // For verifying JWTs

// Assuming your User model is used if you need to fetch full user details from DB
// const User = require('../models/User'); // Uncomment and adjust path if you need to fetch user from DB in middleware

// Middleware to protect routes (Authentication)
const protect = async (req, res, next) => {
    let token;

    // Check if authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer YOUR_JWT_TOKEN")
            token = req.headers.authorization.split(' ')[1];

            // Verify the JWT using your backend's JWT_SECRET
            // This checks if the token was signed by your server and is not expired/tampered
            const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT_SECRET from .env

            // Attach user data from the decoded token to the request
            // This makes req.user.id, req.user.email, req.user.role available in subsequent handlers
            req.user = decoded;

            // If you need to fetch the full, latest user data from the DB for every request:
            // req.user = await User.findById(decoded.id).select('-password'); // Adjust .select() if needed

            next(); // Proceed to the next middleware or route handler

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

    // If no token was provided in the header
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

// Middleware for role-based authorization
// Pass roles as arguments, e.g., authorize('admin', 'manager')
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user object exists from 'protect' middleware and if user's role is in allowed roles
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            console.warn(`Authorization Failed: User ${req.user ? req.user.email : 'unknown'} with role ${req.user ? req.user.role : 'none'} tried to access restricted resource. Required roles: ${roles.join(', ')}`);
            return res.status(403).json({ message: `Forbidden. You do not have the required role.` });
        }
        next(); // User is authorized, proceed
    };
};

// Export the middleware functions
module.exports = { protect, authorize };