const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const { logger } = require('../utils/logger');

//Middleware to protect routes (Authentication)
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      logger.info(`[AUTH] Token validated for user: ${decoded.email || 'unknown'}`);

      return next(); 
    } catch (err) {
      logger.warn(`[AUTH] Token verification failed: ${err.message}`);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  logger.warn('[AUTH] No token provided in request');
  return res.status(401).json({ message: 'Not authorized, no token' });
};

//Middleware for role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        //Check if user object exists from 'protect' middleware and if user's role is in allowed roles
        if (!req.user || !req.user.role || !roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
          logger.warn(`[Auth] Authorization failed: User ${userEmail} with role ${userRole} tried to access restricted resource. Required roles: ${roles.join(', ')}`);
          return res.status(403).json({ message: 'Forbidden. You do not have the required role.' });
        }
        logger.info(`[Auth] Authorization successful for user ${userEmail} with role ${userRole}`);
        next(); 
    };
};

//Middleware for clinic/organization-based filtering
const scope = (modelName) => {
  return (req, res, next) => {
    try {
      const { role, organizationId, clinicId, id } = req.user;

      const filter = { organizationId }; //always org-level first

      switch (role) {
        case "admin":
          //Admin: see everything in the organization
          break;

        case "manager":
          //Manager: restricted to a single clinic
          filter.clinicId = clinicId;
          break;

        case "doctor":
        case "nurse":
          //Staff: handle single vs multi-clinic
          if (Array.isArray(clinicId)) {
            filter.clinicId = { $in: clinicId };
          } else {
            filter.clinicId = clinicId;
          }
          break;

        case "patient":
          if (modelName === "Patient") {
            filter._id = id; //Patient sees only themselves
          } else {
            return res.status(403).json({ message: "Patients cannot access this resource" });
          }
          break;

        default:
          return res.status(403).json({ message: "Unknown role, access denied" });
      }

      req.scopeFilter = filter;
      logger.debug(`[Scope] Applied scope filter for user ${req.user?.email || 'unknown'}: ${JSON.stringify(req.scopeFilter)}`);
      next();
    } catch (err) {
      logger.error(`[Scope] Error applying scope filter: ${err.message}`, { stack: err.stack });
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

module.exports = { protect, authorize, scope };