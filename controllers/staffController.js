const Staff = require('../models/Staff');
const User = require('../models/User');

// Create new staff
const createStaff = async (req, res) => {
  try {
    const { name, role: staffRole, clinicId: bodyClinicId, contact } = req.body;
    const email = contact?.email;

    if (!email || !staffRole) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    const { role: requesterRole, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinicIds = [];
    if (requesterRole === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }
      clinicIds = [bodyClinicId];
    } else if (requesterRole === "manager") {
      if (!userClinicId) {
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }
      clinicIds = [userClinicId];
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    // Check if staff already exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      user.role = staffRole; 
      clinicIds.forEach(cid => {
        if (!user.clinicIds.includes(cid)) {
          user.clinicIds.push(cid);
        }
      });
    } else {
      // Create a new user
      user = new User({
        name,
        email,
        role: staffRole,
        organizationId: userOrgId,
        clinicIds,
        contact
      });
    }

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error("Error creating staff:", err);
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
