const { User, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

// --- Create Manager ---
const createManager = async (req, res) => {
  try {
    logger.info(`👤 [createManager] Incoming request from user=${req.user?.email || 'unknown'}`);
    logger.debug(`📩 [createManager] Request body: ${JSON.stringify(req.body)}`);

    const { name, clinicId, contact } = req.body;
    const email = contact?.email || req.body.email;

    if (!email) {
      logger.warn(`⚠️ [createManager] Missing email in request`);
      return res.status(400).json({ error: "Email is required." });
    }

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) {
      logger.warn(`⚠️ [createManager] Clinic not found for clinicId=${clinicId}`);
      return res.status(404).json({ error: "Clinic not found" });
    }

    let user = await User.findOne({ where: { email } });
    if (user) {
      logger.info(`🔄 [createManager] Existing user found (email=${email}), updating role to manager and assigning clinicId=${clinicId}`);
      await user.update({
        role: "manager",
        clinicId: clinicId,
      });
    } else {
      logger.info(`🆕 [createManager] Creating new manager (name=${name}, email=${email}, clinicId=${clinicId})`);
      user = await User.create({
        name,
        email,
        role: "manager",
        organizationId: req.user?.organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`✅ [createManager] Manager created/updated successfully for email=${email}`);
    res.status(201).json(user);

  } catch (err) {
    logger.error(`❌ [createManager] Error creating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// --- Create Admin ---
const createAdmin = async (req, res) => {
  try {
    logger.info(`👤 [createAdmin] Incoming request from user=${req.user?.email || 'unknown'}`);
    logger.debug(`📩 [createAdmin] Request body: ${JSON.stringify(req.body)}`);

    const { name, email, organizationId, clinicId } = req.body;

    // Basic validation
    if (!name || !email || !organizationId || !clinicId) {
      logger.warn(`⚠️ [createAdmin] Missing required fields (name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId})`);
      return res.status(400).json({
        error: "Name, email, organizationId, and clinicId are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`⚠️ [createAdmin] Invalid email format: ${email}`);
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Ensure organization exists
    const org = await Organization.findOne({ where: { organizationId } });
    if (!org) {
      logger.warn(`⚠️ [createAdmin] Organization not found: organizationId=${organizationId}`);
      return res.status(404).json({ error: "Organization not found" });
    }

    // Ensure clinic exists
    const clinic = await Clinic.findOne({ where: { clinicId, organizationId } });
    if (!clinic) {
      logger.warn(`⚠️ [createAdmin] Clinic not found for clinicId=${clinicId}, organizationId=${organizationId}`);
      return res.status(404).json({ error: "Clinic not found for this organization" });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      logger.info(`🔄 [createAdmin] Existing user found (email=${email}), updating role to admin and clinicId=${clinicId}`);
      await user.update({
        role: "admin",
        clinicId: clinicId,
      });
    } else {
      logger.info(`🆕 [createAdmin] Creating new admin: name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId}`);
      user = await User.create({
        name,
        email,
        role: "admin",
        organizationId: req.user?.organizationId || organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`✅ [createAdmin] Admin created/updated successfully for email=${email}`);
    return res.status(201).json(user);

  } catch (err) {
    logger.error(`❌ [createAdmin] Error creating admin: ${err.message}`, { stack: err.stack });
    return res.status(400).json({ error: err.message });
  }
};

// --- Get All Managers ---
const getManagers = async (req, res) => {
  try {
    logger.info(`👥 [getManagers] Incoming request from user=${req.user?.email || 'unknown'} for orgId=${req.user?.organizationId}`);

    const managers = await User.findAll({
      where: {
        role: 'manager',
        organizationId: req.user.organizationId
      },
      include: [{ model: Clinic, as: 'clinicId', attributes: ['name', 'address', 'type'] }]
    });

    logger.info(`✅ [getManagers] Found ${managers.length} manager(s) for orgId=${req.user.organizationId}`);
    res.json(managers);

  } catch (err) {
    logger.error(`❌ [getManagers] Error fetching managers: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// --- Update Manager ---
const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`🛠️ [updateManager] Request to update managerId=${id} by user=${req.user?.email}`);

    const manager = await User.findOne({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!manager) {
      logger.warn(`⚠️ [updateManager] Manager not found for id=${id}, orgId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    await manager.update(req.body);
    logger.info(`✅ [updateManager] Manager updated successfully for id=${id}`);
    res.json(manager);

  } catch (err) {
    logger.error(`❌ [updateManager] Error updating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// --- Delete Manager ---
const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`🗑️ [deleteManager] Request to delete managerId=${id} by user=${req.user?.email}`);

    const deleted = await User.destroy({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!deleted) {
      logger.warn(`⚠️ [deleteManager] Manager not found for id=${id}, orgId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    logger.info(`✅ [deleteManager] Manager deleted successfully for id=${id}`);
    res.json({ message: 'Manager deleted successfully' });

  } catch (err) {
    logger.error(`❌ [deleteManager] Error deleting manager: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createManager, createAdmin, getManagers, updateManager, deleteManager };
