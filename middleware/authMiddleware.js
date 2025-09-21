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

      console.log('Decoded JWT payload:', decoded);

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

//Middleware for clinic-based filtering
const scope = (modelName) => {
  return (req, res, next) => {
    try {
      const { role, organizationId, clinicId, id } = req.user; 

      const filter = {};

      switch (role) {
        case "admin":
          // org-wide
          filter.organizationId = organizationId;
          break;

        case "manager":
          // single clinic
          filter.organizationId = organizationId;
          filter.clinicId = clinicId;
          break;

        case "doctor":
        case "nurse":
          filter.organizationId = organizationId;
          // multi-clinic staff
          filter.clinicId = { $in: clinicId };
          break;

        case "patient":
          // Patient-specific rules
          switch (modelName) {
            case "Patient":
              // can only see themselves
              filter._id = id;
              break;

            default:
              // patients cannot access staff, rooms, etc
              return res.status(403).json({ message: "Patients cannot access this resource" });
          }
          break;

        default:
          return res.status(403).json({ message: "Unknown role, access denied" });
      }

      req.scopeFilter = filter; // attach filter to request
      next();
    } catch (err) {
      console.error("Scope middleware error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Export the middleware functions
module.exports = { protect, authorize, scope };