const { User, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

//create manager
const createManager = async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const { name, clinicId, contact } = req.body;
    const email = contact?.email || req.body.email;

    if (!email) return res.status(400).json({ error: "Email is required." });

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) return res.status(404).json({ error: "Clinic not found" });

    let user = await User.findOne({ where: { email } });

    if (user) {
      // Update existing user
      await user.update({
        role: "manager",
        clinicId: clinicId // assign directly (not array)
      });
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        role: "manager",
        organizationId: req.user.organizationId,
        clinicId: clinicId,
      });
    }

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
    const org = await Organization.findOne({ where: { organizationId } });
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    //Ensure clinic exists
    const clinic = await Clinic.findOne({ where: { clinicId, organizationId } });
    if (!clinic) {
      return res
        .status(404)
        .json({ error: "Clinic not found for this organization" });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      await user.update({
        role: "admin",
        clinicId: clinicId
      });
    } else {
      // Create new admin
      user = await User.create({
        name,
        email,
        role: "admin",
        organizationId: req.user.organizationId,
        clinicId: clinicId,
      });
    }

    return res.status(201).json(user);
  } catch (err) {
    console.error("Error creating admin:", err);
    return res.status(400).json({ error: err.message });
  }
};


//get all managers
const getManagers = async (req, res) => {
  try {
    const managers = await User.findAll({
      where: {
        role: 'manager',
        organizationId: req.user.organizationId
      },
      include: [{ model: Clinic, as: 'clinicId', attributes: ['name', 'address', 'type'] }]
    });

    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//update manager
const updateManager = async (req, res) => {
  try {
    const { id } = req.params;

    const manager = await User.findOne({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!manager) return res.status(404).json({ error: 'Manager not found' });

    await manager.update(req.body);
    res.json(manager);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//delete manager
const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.destroy({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!deleted) return res.status(404).json({ error: 'Manager not found' });
    res.json({ message: 'Manager deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createManager, createAdmin, getManagers, updateManager, deleteManager };
