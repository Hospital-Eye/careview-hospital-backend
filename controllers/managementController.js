const { User, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a manager 
const createManager = async (req, res) => {
  const endpoint = 'createManager';
  const userEmail = req.user?.email || 'unknown';
  const clinic = req.body.clinicId;

  logger.info(`[${endpoint}] Incoming request to create manager for clinic: ${clinic} from user: ${userEmail}`);

  try {
  
    const { name, clinicId, contact } = req.body;
    const email = contact?.email || req.body.email;

    if (!email) {
      logger.warn(`[${endpoint}] Missing email in request`);
      return res.status(400).json({ error: "Email is required." });
    }

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) {
      logger.warn(`[${endpoint}] Clinic not found for clinicId=${clinicId}`);
      return res.status(404).json({ error: "Clinic not found" });
    }

    let user = await User.findOne({ where: { email } });
    if (user) {
      logger.info(`[${endpoint}] Existing user found (email=${email}), updating role to manager and assigning clinicId=${clinicId}`);
      await user.update({
        role: "manager",
        clinicId: clinicId,
      });
    } else {
      user = await User.create({
        name,
        email,
        role: "manager",
        organizationId: req.user?.organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`[${endpoint}] Manager created successfully with (name=${name}, email=${email}, clinicId=${clinicId})`);
    res.status(201).json(user);

  } catch (err) {
    logger.error(`[${endpoint}] Error creating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Create an admin
const createAdmin = async (req, res) => {
  const endpoint = 'createAdmin';
  const userEmail = req.user?.email || 'unknown';
  const org = req.body.organizationId;
  
  logger.info(`[${endpoint}] Incoming request to create admin for organization: ${org} from user: ${userEmail}`);
  try {

    const { name, email, organizationId, clinicId } = req.body;

    if (!name || !email || !organizationId || !clinicId) {
      logger.warn(`[${endpoint}] Missing required fields (name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId})`);
      return res.status(400).json({
        error: "Name, email, organizationId, and clinicId are required",
      });
    }

    //validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`[${endpoint}] Invalid email format while creating admin: ${email}`);
      return res.status(400).json({ error: "Invalid email format" });
    }

    //ensure organization exists
    const org = await Organization.findOne({ where: { organizationId } });
    if (!org) {
      logger.warn(`[${endpoint}] Organization not found while creating admin: organizationId=${organizationId}`);
      return res.status(404).json({ error: "Organization not found" });
    }

    //ensure clinic exists
    const clinic = await Clinic.findOne({ where: { clinicId, organizationId } });
    if (!clinic) {
      logger.warn(`[${endpoint}] Clinic not found for clinicId=${clinicId}, organizationId=${organizationId}`);
      return res.status(404).json({ error: "Clinic not found for this organization" });
    }

    //check if user already exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      logger.info(`[${endpoint}] Existing user found (email=${email}), updating role to admin and clinicId=${clinicId}`);
      await user.update({
        role: "admin",
        clinicId: clinicId,
      });
    } else {
      user = await User.create({
        name,
        email,
        role: "admin",
        organizationId: req.user?.organizationId || organizationId,
        clinicId: clinicId,
      });
    }

    logger.info(`[${endpoint}] Admin created successfully with name=${name}, email=${email}, orgId=${organizationId}, clinicId=${clinicId}`);
    return res.status(201).json(user);

  } catch (err) {
    logger.error(`[${endpoint}] Error creating admin: ${err.message}`, { stack: err.stack });
    return res.status(400).json({ error: err.message });
  }
};

//Get all managers
const getManagers = async (req, res) => {
  const endpoint = 'getManagers';
  const userEmail = req.user?.email || 'unknown';
  const org = req.user?.organizationId;
  const clinic = req.user?.clinicId;

  logger.info(`[${endpoint}] Incoming request to view all managers from organization: ${org} and clinic: ${clinic} from user: ${userEmail}`);
  try {

    const managers = await User.findAll({
      where: {
        role: 'manager',
        organizationId: req.user.organizationId
      },
      include: [{ model: Clinic, as: 'clinicId', attributes: ['name', 'address', 'type'] }]
    });

    logger.info(`[${endpoint}] Found ${managers.length} manager(s) for orgId=${req.user.organizationId}`);
    res.json(managers);

  } catch (err) {
    logger.error(`[${endpoint}] Error fetching managers: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

//Update Manager
const updateManager = async (req, res) => {
  const endpoint = 'updateManager';
  const userEmail = req.user?.email || 'unknown';
  const clinic = req.body.clinicId;
  const id = req.params.id;

  logger.info(`[${endpoint}] Incoming request to update manager having id: ${id} belonging to clinic: ${clinic} received from user: ${userEmail}`);
  try {
    const { id } = req.params;
    
    const manager = await User.findOne({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!manager) {
      logger.warn(`[${endpoint}] Manager not found for id=${id}, organizationId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    await manager.update(req.body);
    logger.info(`[${endpoint}] Manager updated successfully for id=${id}`);
    res.json(manager);

  } catch (err) {
    logger.error(`[${endpoint}] Error updating manager: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Delete Manager
const deleteManager = async (req, res) => {
  const endpoint = 'deleteManager';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;
  const clinic = req.body.clinicId;

  logger.info(`[${endpoint}] Incoming request to delete manager having id: ${req.params.id} belonging to clinic: ${clinic} received from user: ${userEmail}`);
  try {
    const { id } = req.params;
    
    const deleted = await User.destroy({
      where: {
        id: id,
        role: 'manager',
        organizationId: req.user.organizationId
      }
    });

    if (!deleted) {
      logger.warn(`[${endpoint}] Manager not found for id=${id}, organizationId=${req.user.organizationId}`);
      return res.status(404).json({ error: 'Manager not found' });
    }

    logger.info(`[${endpoint}] Manager deleted successfully for id=${id}`);
    res.json({ message: 'Manager deleted successfully' });

  } catch (err) {
    logger.error(`[${endpoint}] Error deleting manager: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createManager, createAdmin, getManagers, updateManager, deleteManager };
