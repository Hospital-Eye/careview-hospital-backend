const { Staff, User, Clinic, Organization, Counter } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');
const canActOn = require("../middleware/canActOn");
const roleHierarchy = require("../models/roleHierarchy");
const logger = require('../utils/logger');

//create staff
// ----------------- Helper: Generate Unique 10-Digit Employee ID -----------------
const existingEmployeeIds = new Set();

async function generateUniqueEmployeeId() {
  let id;
  let exists = true;

  while (exists) {
    // Generate a random 10-digit number (string)
    id = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Quick in-memory check
    if (existingEmployeeIds.has(id)) continue;

    // Check DB to avoid collision across server restarts or multiple instances
    const found = await Staff.findOne({ where: { employeeId: id } });
    if (!found) {
      exists = false;
      existingEmployeeIds.add(id);
    }
  }

  return id;
}

// ----------------- Controller: Create Staff -----------------
const createStaff = async (req, res) => {
  const endpoint = 'createStaff';
  const userEmail = req.user?.email || 'unknown';
  const userRole = req.user?.role || 'unknown';
  const t = await sequelize.transaction();

  logger.info(`📋 [${endpoint}] Request received from ${userEmail} (role: ${userRole})`, {
    body: req.body,
  });

  try {
    const { name, role: staffRole, status, contact } = req.body;
    const email = contact?.email;
    const phone = contact?.phone;

    // ----------------- Validation -----------------
    if (!email || !staffRole) {
      logger.warn(`⚠️ [${endpoint}] Missing required fields: email or role`);
      await t.rollback();
      return res.status(400).json({ error: "Email and role are required." });
    }

    const { role: requesterRole, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      logger.warn(`⚠️ [${endpoint}] Missing organizationId in user context`);
      await t.rollback();
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    // ----------------- Determine clinicId -----------------
    let clinicId;
    if (requesterRole === "admin") {
      clinicId = req.body.clinicId;
      if (!clinicId) {
        logger.warn(`⚠️ [${endpoint}] Admin did not provide clinicId in request`);
        await t.rollback();
        return res.status(400).json({ error: "clinicId is required in request body for admins" });
      }
    } else if (requesterRole === "manager") {
      clinicId = userClinicId;
      if (!clinicId) {
        logger.warn(`⚠️ [${endpoint}] Manager missing associated clinic`);
        await t.rollback();
        return res.status(400).json({ error: "Manager is not associated with any clinic" });
      }
    } else {
      logger.warn(`🚫 [${endpoint}] Unauthorized role attempted staff creation: ${requesterRole}`);
      await t.rollback();
      return res.status(403).json({ error: "Only admins and managers can create staff" });
    }

    // ----------------- Generate Unique Employee ID -----------------
    const employeeId = await generateUniqueEmployeeId();
    logger.info(`🆔 [${endpoint}] Generated unique employeeId: ${employeeId}`);

    // ----------------- Upsert User -----------------
    let user = await User.findOne({ where: { email }, transaction: t });

    if (user) {
      logger.info(`♻️ [${endpoint}] Existing user found: ${email}, updating user record`);
      await user.update(
        {
          role: staffRole,
          employeeId: user.employeeId || employeeId,
          organizationId: user.organizationId || userOrgId,
          clinicId: user.clinicId || clinicId,
          contact: { email, phone },
        },
        { transaction: t }
      );
    } else {
      logger.info(`🆕 [${endpoint}] Creating new user: ${email}`);
      user = await User.create(
        {
          name,
          email,
          role: staffRole,
          organizationId: userOrgId,
          clinicId,
          contact: { email, phone },
          employeeId,
        },
        { transaction: t }
      );
    }

    // ----------------- Upsert Staff -----------------
    let staff = await Staff.findOne({ where: { userId: user.id }, transaction: t });

    if (staff) {
      logger.info(`♻️ [${endpoint}] Existing staff record found, updating staff for userId: ${user.id}`);
      await staff.update(
        {
          name,
          role: staffRole,
          organizationId: userOrgId,
          clinicId,
          contact: { email, phone },
          status: status || staff.status,
        },
        { transaction: t }
      );
    } else {
      logger.info(`🆕 [${endpoint}] Creating new staff record for userId: ${user.id}`);
      staff = await Staff.create(
        {
          employeeId,
          organizationId: userOrgId,
          clinicId,
          userId: user.id,
          name,
          role: staffRole,
          contact: { email, phone },
          status: status || "On-Duty",
        },
        { transaction: t }
      );
    }

    await t.commit();
    logger.info(`✅ [${endpoint}] Staff created successfully (userId: ${user.id}, employeeId: ${employeeId})`);
    res.status(201).json({ user, staff });

  } catch (err) {
    await t.rollback();
    logger.error(`❌ [${endpoint}] Error creating staff: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};


/*
// ----------------- Controller: Create Staff -----------------
const createStaff = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, role: staffRole, status, contact } = req.body;
    const email = contact?.email;
    const phone = contact?.phone;

    // ----------------- Validation -----------------
    if (!email || !staffRole) {
      await t.rollback();
      return res.status(400).json({ error: "Email and role are required." });
    }

    const { role: requesterRole, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      await t.rollback();
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    // ----------------- Determine clinicId -----------------
    let clinicId;
    if (requesterRole === "admin") {
      clinicId = req.body.clinicId;
      if (!clinicId) {
        await t.rollback();
        return res.status(400).json({ error: "clinicId is required in request body for admins" });
      }
    } else if (requesterRole === "manager") {
      clinicId = userClinicId;
      if (!clinicId) {
        await t.rollback();
        return res.status(400).json({ error: "Manager is not associated with any clinic" });
      }
    } else {
      await t.rollback();
      return res.status(403).json({ error: "Only admins and managers can create staff" });
    }

    // ----------------- Generate Unique Random Employee ID -----------------
    const employeeId = await generateUniqueEmployeeId();

    // ----------------- Upsert User -----------------
    let user = await User.findOne({ where: { email }, transaction: t });

    if (user) {
      await user.update({
        role: staffRole,
        employeeId: user.employeeId || employeeId,
        organizationId: user.organizationId || userOrgId,
        clinicId: user.clinicId || clinicId,
        contact: { email, phone }
      }, { transaction: t });
    } else {
      user = await User.create({
        name,
        email,
        role: staffRole,
        organizationId: userOrgId,
        clinicId,
        contact: { email, phone },
        employeeId,
      }, { transaction: t });
    }

    // ----------------- Upsert Staff -----------------
    let staff = await Staff.findOne({ where: { userId: user.id }, transaction: t });

    if (staff) {
      await staff.update({
        name,
        role: staffRole,
        organizationId: userOrgId,
        clinicId,
        contact: { email, phone },
        status: status || staff.status
      }, { transaction: t });
    } else {
      staff = await Staff.create({
        employeeId,
        organizationId: userOrgId,
        clinicId,
        userId: user.id,
        name,
        role: staffRole,
        contact: { email, phone },
        status: status || "On-Duty",
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ user, staff });
  } catch (err) {
    await t.rollback();
    console.error("Error creating staff:", err);
    res.status(400).json({ error: err.message });
  }
};
*/

// GET all staff
const getAllStaff = async (req, res) => {
  const endpoint = 'getAllStaff';
  const userEmail = req.user?.email || 'unknown';
  const role = req.user?.role || 'unknown';

  logger.info(`📡 [${endpoint}] Request received from ${userEmail} (role: ${role})`);

  try {
    if (!["admin", "manager", "doctor"].includes(role.toLowerCase())) {
      logger.warn(`🚫 [${endpoint}] Forbidden access by role: ${role}`);
      return res.status(403).json({
        error: "Forbidden. Only admins, managers, or doctors can view staff.",
      });
    }

    const staff = await Staff.findAll({ where: req.scopeFilter });

    logger.info(`✅ [${endpoint}] Retrieved ${staff.length} staff records`);
    res.json(staff);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error fetching staff: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: "Server error" });
  }
};

// GET one staff
const getStaffById = async (req, res) => {
  const endpoint = 'getStaffById';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`📡 [${endpoint}] Fetching staff by ID: ${id} (requested by ${userEmail})`);

  try {
    const staff = await Staff.findByPk(id);
    if (!staff) {
      logger.warn(`⚠️ [${endpoint}] Staff not found (ID: ${id})`);
      return res.status(404).json({ error: 'Staff not found' });
    }

    logger.info(`✅ [${endpoint}] Staff record retrieved successfully (ID: ${id})`);
    res.json(staff);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error fetching staff by ID: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// UPDATE staff
const updateStaff = async (req, res) => {
  const endpoint = 'updateStaff';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`✏️ [${endpoint}] Update request received for staff ID: ${id} by ${userEmail}`, {
    body: req.body,
  });

  try {
    const staff = await Staff.findByPk(id);
    if (!staff) {
      logger.warn(`⚠️ [${endpoint}] Staff not found (ID: ${id})`);
      return res.status(404).json({ error: 'Staff not found' });
    }

    await staff.update(req.body);
    logger.info(`✅ [${endpoint}] Staff updated successfully (ID: ${id})`);
    res.json(staff);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error updating staff: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// DELETE staff
const deleteStaff = async (req, res) => {
  const endpoint = 'deleteStaff';
  const userEmail = req.user?.email || 'unknown';
  const { id } = req.params;

  logger.info(`🗑️ [${endpoint}] Delete request for staff ID: ${id} by ${userEmail}`);

  try {
    if (!isUUID(id)) {
      logger.warn(`⚠️ [${endpoint}] Invalid staff ID format: ${id}`);
      return res.status(400).json({ error: "Invalid staff ID" });
    }

    const target = await Staff.findByPk(id);
    if (!target) {
      logger.warn(`⚠️ [${endpoint}] Staff not found (ID: ${id})`);
      return res.status(404).json({ error: "Staff not found" });
    }

    await Staff.destroy({ where: { id } });
    logger.info(`✅ [${endpoint}] Staff deleted successfully (ID: ${id})`);
    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error deleting staff: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = { createStaff, getAllStaff, getStaffById, updateStaff, deleteStaff };
