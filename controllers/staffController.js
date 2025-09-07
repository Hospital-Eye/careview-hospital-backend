const Staff = require('../models/Staff');

// Create new staff
const createStaff = async (req, res) => {
  try {
    const { _id, organizationId, clinicId, ...staffData } = req.body;

    if (!req.user || !req.user.organizationId || !req.user.clinicId) {
      return res.status(403).json({ error: "Unauthorized: missing organization/clinic info" });
    }

    // Always assign org from JWT
    staffData.organizationId = req.user.organizationId;

    // Role-based clinic assignment
    switch (req.user.role) {
      case "admin":
        // Admin can assign staff to any clinic in their org
        // → take from request body, but enforce it's in user's clinicId if provided
        if (clinicId && req.user.clinicId === clinicId) {
          staffData.clinicId = clinicId;
        } else {
          // fallback: default to first clinic
          staffData.clinicId = req.user.clinicIds[0];
        }
        break;

      case "manager":
        // Manager can only create staff in their single clinic
        staffData.clinicId = req.user.clinicId;
        break;

      case "doctor":
      case "nurse":
        return res.status(403).json({ error: "Not authorized to create staff" });

      default:
        return res.status(403).json({ error: "Unknown role" });
    }

    const staff = new Staff(staffData);
    await staff.save();

    res.status(201).json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all staff (restricted by role/org/clinic)
const getAllStaff = async (req, res) => {
  try {
    const { role, organizationId, clinicId } = req.user; // from JWT

    let filter = {};

    if (role === "admin") {
      // Admin can see all staff in the organization
      filter.organizationId = organizationId;
    } else if (role === "manager") {
      // Manager can only see staff in their clinic
      filter.organizationId = organizationId;
      filter.clinicId = clinicId;
    } else {
      return res
        .status(403)
        .json({ error: "Forbidden. Only admins or managers can view staff." });
    }

    const staff = await Staff.find(filter);
    res.json(staff);
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
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createStaff, getAllStaff, getStaffById, updateStaff, deleteStaff };
