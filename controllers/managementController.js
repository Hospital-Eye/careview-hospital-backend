const { User, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a manager 
const createManager = async (req, res) => {
  try {
    logger.info(`[Manager] Request to create manager from user=${req.user?.email || 'unknown'}`);
    logger.debug(`[Manager] Request body: ${JSON.stringify(req.body)}`);

    const { name, clinicId, contact } = req.body;
    const email = contact?.email || req.body.email;

    if (!email) {
      logger.warn(`[Manager] Missing email in request`);
      return res.status(400).json({ error: "Email is required." });
    }

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) {
      logger.warn(`[Manager] Clinic not found for clinicId=${clinicId}`);
      return res.status(404).json({ error: "Clinic not found" });
    }

    let user = await User.findOne({ where: { email } });
    if (user) {
      logger.info(`[Manager] Existing user found (email=${email}), updating role to manager and assigning clinicId=${clinicId}`);
      await user.update({
        role: "manager",
        clinicId: clinicId,
      });
    } else {
      logger.info(`[Manager] Creating new manager (name=${name}, email=${email}, clinicId=${clinicId})`);
      user = await User.create({
        name,
        email,
        role: "manager",
        organizationId: req.user?.organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`[Manager] Manager created/updated successfully for email=${email}`);
    res.status(201).json(user);

  } catch (err) {
    logger.error(`[Manager] Error creating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Create an admin
const createAdmin = async (req, res) => {
  try {
    logger.info(`[Admin] Incoming request to create admin from user=${req.user?.email || 'unknown'}`);
    logger.debug(`[Admin] Request body: ${JSON.stringify(req.body)}`);

    const { name, email, organizationId, clinicId } = req.body;

    if (!name || !email || !organizationId || !clinicId) {
      logger.warn(`[Admin] Missing required fields (name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId})`);
      return res.status(400).json({
        error: "Name, email, organizationId, and clinicId are required",
      });
    }

    //validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`[Admin] Invalid email format while creating admin: ${email}`);
      return res.status(400).json({ error: "Invalid email format" });
    }

    //ensure organization exists
    const org = await Organization.findOne({ where: { organizationId } });
    if (!org) {
      logger.warn(`[Admin] Organization not found while creating admin: organizationId=${organizationId}`);
      return res.status(404).json({ error: "Organization not found" });
    }

    //ensure clinic exists
    const clinic = await Clinic.findOne({ where: { clinicId, organizationId } });
    if (!clinic) {
      logger.warn(`[Admin] Clinic not found for clinicId=${clinicId}, organizationId=${organizationId}`);
      return res.status(404).json({ error: "Clinic not found for this organization" });
    }

    //check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      logger.info(`[Admin] Existing user found (email=${email}), updating role to admin and clinicId=${clinicId}`);
      await user.update({
        role: "admin",
        clinicId: clinicId,
      });
    } else {
      logger.info(`[Admin] Creating new admin: name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId}`);
      user = await User.create({
        name,
        email,
        role: "admin",
        organizationId: req.user?.organizationId || organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`[Admin] Admin created/updated successfully for email=${email}`);
    return res.status(201).json(user);

  } catch (err) {
    logger.error(`[Admin] Error creating admin: ${err.message}`, { stack: err.stack });
    return res.status(400).json({ error: err.message });
  }
};

//Get all managers
const getManagers = async (req, res) => {
  try {
    logger.info(`[Manager] Incoming request to view all managers from user=${req.user?.email || 'unknown'} for orgId=${req.user?.organizationId}`);

    const managers = await User.findAll({
      where: {
        role: 'manager',
        organizationId: req.user.organizationId
      },
      include: [{ model: Clinic, as: 'clinicId', attributes: ['name', 'address', 'type'] }]
    });

    logger.info(`[Manager] Found ${managers.length} manager(s) for orgId=${req.user.organizationId}`);
    res.json(managers);

  } catch (err) {
    logger.error(`[Manager] Error fetching managers: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

//Update Manager
const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[Manager] Incoming request to update managerId=${id} by user=${req.user?.email}`);

    const manager = await User.findOne({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!manager) {
      logger.warn(`[Manager] Manager not found for id=${id}, orgId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    await manager.update(req.body);
    logger.info(`[Manager] Manager updated successfully for id=${id}`);
    res.json(manager);

  } catch (err) {
    logger.error(`[Manager] Error updating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Delete Manager
const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[Manager] Incoming request to delete managerId=${id} by user=${req.user?.email}`);

    const deleted = await User.destroy({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!deleted) {
      logger.warn(`[Manager] Manager not found for id=${id}, orgId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    logger.info(`[Manager] Manager deleted successfully for id=${id}`);
    res.json({ message: 'Manager deleted successfully' });

  } catch (err) {
    logger.error(`[Manager] Error deleting manager: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createManager, createAdmin, getManagers, updateManager, deleteManager };
