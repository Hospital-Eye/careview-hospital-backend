const Staff = require('../models/Staff');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Organization = require('../models/Organization');
const canActOn = require("../middleware/canActOn");
const roleHierarchy = require("../models/roleHierarchy");
const mongoose = require("mongoose");

// Create new staff
const createStaff = async (req, res) => {
  try {
    const { name, email, role: staffRole, clinicId, status } = req.body;

    if (!email || !staffRole) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    const { role: requesterRole, organizationId: userOrgId } = req.user;

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    if (!clinicId) {
      return res.status(400).json({ error: "clinicId is required in request body" });
    }

    // ----------------- Auto-generate Employee ID -----------------
    function clinicPrefix(clinicId) {
      const parts = clinicId.split("-");
      const name = parts[0].substring(0, 3).toUpperCase();
      const number = parts[1] || "1";
      return `${name}${number}`;
    }

    const prefix = clinicPrefix(clinicId);
    const count = await Staff.countDocuments({ clinicId });
    const nextNumber = 1000 + count + 1;
    const employeeId = `${prefix}-${nextNumber}`;

    // ----------------- Upsert User -----------------
    let user = await User.findOne({ email });

    if (user) {
      user.role = staffRole;
      user.employeeId = user.employeeId || employeeId;
      user.organizationId = user.organizationId || userOrgId;
      user.clinicId = user.clinicId || clinicId;
      user.contact = { email, phone: user.contact?.phone || "" };
    } else {
      user = new User({
        name,
        email,
        role: staffRole,
        organizationId: userOrgId,
        clinicId,
        contact: { email },
        employeeId,
      });
    }

    await user.save();

    // ----------------- Upsert Staff -----------------
    let staff = await Staff.findOne({ userId: user._id });

    if (staff) {
      staff.name = name;
      staff.role = staffRole;
      staff.organizationId = userOrgId;
      staff.clinicId = clinicId;
      staff.contact = { email, phone: staff.contact?.phone || "" };
      staff.status = status || staff.status;
    } else {
      staff = new Staff({
        employeeId,
        organizationId: userOrgId,
        clinicId,
        userId: user._id,
        name,
        role: staffRole,
        contact: { email },
        status: status || "On-Duty",
      });
    }

    await staff.save();

    res.status(201).json({ user, staff });
  } catch (err) {
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

    const staff = await Staff.find(filter).lean();

    // Normalize so frontend never breaks
    const normalized = staff.map((s) => ({
      ...s,
      contact: {
        email: s.contact?.email || s.email || "",
        phone: s.contact?.phone || "",
      },
    }));

    res.json(normalized);
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get one staff
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid staff ID" });
    }

    const target = await Staff.findById(id);
    if (!target) {
      return res.status(404).json({ error: "Staff not found" });
    }

    // check role hierarchy here if needed

    await Staff.findByIdAndDelete(id);
    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Error deleting staff:", err);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = { createStaff, getAllStaff, getStaffById, updateStaff, deleteStaff };
