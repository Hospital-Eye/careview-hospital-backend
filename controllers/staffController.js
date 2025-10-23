const { Staff, User, Clinic, Organization, Counter } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');
const canActOn = require("../middleware/canActOn");
const roleHierarchy = require("../models/roleHierarchy");

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

// Get all staff (restricted by role/org/clinic + scope)
const getAllStaff = async (req, res) => {
  try {
    const { role, organizationId, clinicId } = req.user; // from JWT
    const scopeFilter = req.scopeFilter || {};

    let filter = { ...scopeFilter }; // start with scope

    if (role === "admin") {
      // Admin can see all staff in the organization (within scope)
      filter.organizationId = organizationId;
    } else if (role === "manager") {
      // Manager can only see staff in their clinic (within scope)
      filter.organizationId = organizationId;
      filter.clinicId = clinicId;
    } else {
      return res
        .status(403)
        .json({ error: "Forbidden. Only admins or managers can view staff." });
    }

    const staff = await Staff.findAll({ where: filter });

    // Normalize so frontend never breaks
    const normalized = staff.map((s) => {
      const staffData = s.get({ plain: true });
      return {
        ...staffData,
        contact: {
          email: staffData.contact?.email || staffData.email || "",
          phone: staffData.contact?.phone || "",
        },
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get one staff
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    await staff.update(req.body);
    res.json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete staff
// DELETE /staff/:id
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid staff ID" });
    }

    const target = await Staff.findByPk(id);
    if (!target) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // check role hierarchy here if needed

    await Staff.destroy({ where: { id } });
    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Error deleting staff:", err);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = { createStaff, getAllStaff, getStaffById, updateStaff, deleteStaff };
