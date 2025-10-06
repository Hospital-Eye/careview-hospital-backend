const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Organization = require('../models/Organization');

//create manager
const createManager = async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const { name, clinicId, contact } = req.body;
    const email = contact?.email || req.body.email;

    if (!email) return res.status(400).json({ error: "Email is required." });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ error: "Clinic not found" });

    let user = await User.findOne({ email });

    if (user) {
  // Update existing user
  user.role = "manager";
  user.clinicId = clinicId; // ✅ assign directly (not array)
} else {
  // Create new user
  user = new User({
    name,
    email,
    role: "manager",
    organizationId: req.user.organizationId,
    clinicId: clinicId, 
  });
}

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error("Error creating manager:", err);
    res.status(400).json({ error: err.message });
  }
};

//create Admin
// ----------------- Controller -----------------
const createAdmin = async (req, res) => {
  try {
    const { name, email, organizationId, clinicId } = req.body;

    //Basic validation
    if (!name || !email || !organizationId || !clinicId) {
      return res.status(400).json({
        error: "Name, email, organizationId, and clinicId are required",
      });
    }

    //Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    //Ensure organization exists
    const org = await Organization.findOne({ organizationId });
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    //Ensure clinic exists
    const clinic = await Clinic.findOne({ clinicId, organizationId });
    if (!clinic) {
      return res
        .status(404)
        .json({ error: "Clinic not found for this organization" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      user.role = "admin";
      if (!user.clinicIds.includes(clinic._id)) {
        user.clinicIds.push(clinic._id);
      }
      if (!user.organizationIds?.includes(org.organizationId)) {
        user.organizationIds = [...(user.organizationIds || []), org.organizationId];
      }
    } else {
      // Create new admin
      user = new User({
        name,
        email,
        role: "admin",
        organizationId: organizationId,
        clinicId: clinicId,
      });
    }

    await user.save();
    return res.status(201).json(user);
  } catch (err) {
    console.error("Error creating admin:", err);
    return res.status(400).json({ error: err.message });
  }
};


//get all managers
const getManagers = async (req, res) => {
  try {
    const managers = await User.find({
      role: 'manager',
      organizationId: req.user.organizationId
    }).populate('clinicId', 'name address type'); // show clinic details

    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//update manager 
const updateManager = async (req, res) => {
  try {
    const { id } = req.params;

    const manager = await User.findOneAndUpdate(
      { _id: id, role: 'manager', organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );

    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.json(manager);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//delete manager
const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;

    const manager = await User.findOneAndDelete({
      _id: id,
      role: 'manager',
      organizationId: req.user.organizationId
    });

    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.json({ message: 'Manager deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createManager, createAdmin, getManagers, updateManager, deleteManager };
