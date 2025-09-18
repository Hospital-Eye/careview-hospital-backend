const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Organization = require('../models/Organization');

//create manager
const createManager = async (req, res) => {
  try {
    const { name, email, clinicId } = req.body;

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });

    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      user.role = 'manager';
      if (!user.clinicIds.includes(clinic._id)) {
        user.clinicIds.push(clinic._id);
      }
    } else {
      // Create new user
      user = new User({
        name,
        email,
        role: 'manager',
        organizationId: req.user.organizationId,
        clinicIds: [clinic._id]
      });
    }

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//get all managers
const getManagers = async (req, res) => {
  try {
    const managers = await User.find({
      role: 'manager',
      organizationId: req.user.organizationId
    }).populate('clinicIds', 'name address type'); // show clinic details

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

module.exports = { createManager, getManagers, updateManager, deleteManager };
