const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const { Op } = require('sequelize');
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

      console.log('Decoded JWT payload:', decoded);

      logger.info(`[AUTH: protect] Token validated for user: ${decoded.email || 'unknown'}`);

      return next(); 
    } catch (err) {
      logger.warn(`[AUTH: protect] Token verification failed: ${err.message}`);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  logger.warn('[AUTH: protect] No token provided in request');
  return res.status(401).json({ message: 'Not authorized, no token' });
};

//Middleware for role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {

      if (req._skipAuthorize) {
      return next();
    }
      const userEmail = req.user?.email || 'unknown';
      const userRole = req.user?.role || 'unknown';
        //Check if user object exists from 'protect' middleware and if user's role is in allowed roles
        if (!req.user || !req.user.role || !roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
          logger.warn(`[AUTH: authorize] Authorization failed: User ${userEmail} with role ${userRole} tried to access restricted resource. Required roles: ${roles.join(', ')}`);
          return res.status(403).json({ message: 'Forbidden. You do not have the required role.' });
        }
        logger.info(`[AUTH: authorize] Authorization successful for user ${userEmail} with role ${userRole}`);
        next(); 
    };
};


//Middleware to apply organization and clinic scope based on user role
const scope = () => {
  return (req, res, next) => {
    try {
      const { role, organizationId, clinicId } = req.user;

      // USE MODEL ATTRIBUTE NAMES
      const filter = { organizationId };

      switch (role) {
        case 'admin':
          break;

        case 'manager':
          filter.clinicId = clinicId;
          break;

        case 'doctor':
        case 'nurse':
          if (Array.isArray(clinicId)) {
            filter.clinicId = { [Op.in]: clinicId };
          } else {
            filter.clinicId = clinicId;
          }
          break;

        case 'patient':
        case 'user':
          return next();

        default:
          return res.status(403).json({ message: 'Unknown role' });
      }

      req.scopeFilter = filter;
      return next();
    } catch (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};


const patientCheck = async (req, res, next) => {
  try {
    if (req.user.role !== "patient") {
      return next();
    }

    const { Patient, Scan } = require("../models");

    const patientRecord = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patientRecord) {
      return res.status(404).json({
        error: "No patient record found for this user."
      });
    }

    // 🧠 CASE 1: scan-based access
    if (req.params.scanId) {
      const scan = await Scan.findOne({
        where: { id: req.params.scanId }
      });

      if (!scan) {
        return res.status(404).json({ error: "Scan not found." });
      }

      if (String(scan.patientId) !== String(patientRecord.id)) {
        return res.status(403).json({
          error: "Patients can only access their own scans."
        });
      }

      req._skipAuthorize = true;
      return next();
    }

    // 🧠 CASE 2: patient-based access (existing logic)
    const requestedId =
      req.params.patientId ||
      req.params.id ||
      req.params.mrn ||
      req.query.mrn;

    if (!requestedId) {
      return res.status(403).json({
        error: "Invalid patient request. Missing patient identifier."
      });
    }

    const allowedIdentifiers = [
      patientRecord.id,
      patientRecord.uuid,
      patientRecord.mrn,
      patientRecord.userId
    ].map(String);

    if (!allowedIdentifiers.includes(String(requestedId))) {
      return res.status(403).json({
        error: "Patients can only access their own records."
      });
    }

    req._skipAuthorize = true;
    next();
  } catch (err) {
    console.error("patientCheck error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = { protect, authorize, scope, patientCheck };