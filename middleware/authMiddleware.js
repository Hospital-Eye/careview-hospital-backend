const jwt = require('jsonwebtoken'); // For verifying JWTs
const User = require('../models/User'); 

// Middleware to protect routes (Authentication)
const protect = (req, res, next) => {
  console.log('protect middleware reached');
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT payload:', decoded);

      req.user = decoded;

      return next(); // ✅ Add return here so function exits cleanly
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // ✅ Only runs if the first if didn't match
  return res.status(401).json({ message: 'Not authorized, no token' });
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

// Middleware for clinic/org-based filtering
const scope = (modelName) => {
  return (req, res, next) => {
    try {
      const { role, organizationId, clinicId, id } = req.user;

      const filter = { organizationId }; // always org-level first

      switch (role) {
        case "admin":
          // Admin: see everything in the org (no clinic filter)
          break;

        case "manager":
          // Manager: restricted to a single clinic
          filter.clinicId = clinicId;
          break;

        case "doctor":
        case "nurse":
          // Staff: handle single vs multi-clinic
          if (Array.isArray(clinicId)) {
            filter.clinicId = { $in: clinicId };
          } else {
            filter.clinicId = clinicId;
          }
          break;

        case "patient":
          if (modelName === "Patient") {
            filter._id = id; // patient sees only themselves
          } else {
            return res.status(403).json({ message: "Patients cannot access this resource" });
          }
          break;

        default:
          return res.status(403).json({ message: "Unknown role, access denied" });
      }

      req.scopeFilter = filter;
      next();
    } catch (err) {
      console.error("Scope middleware error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};


// Export the middleware functions
module.exports = { protect, authorize, scope };