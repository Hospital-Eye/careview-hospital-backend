const { DeviceLog, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

// Create a new device log
const createDeviceLog = async (req, res) => {
  const endpoint = 'createDeviceLog';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`📥 [${endpoint}] Request received from ${userEmail}`, { body: req.body });

  try {
    const log = await DeviceLog.create(req.body);
    logger.info(`✅ [${endpoint}] Device log created successfully`, { id: log.id, user: userEmail });
    res.status(201).json(log);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error creating device log: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// Get all device logs
const getDeviceLogs = async (req, res) => {
  const endpoint = 'getDeviceLogs';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`📡 [${endpoint}] Fetching all device logs for ${userEmail}`);

  try {
    const logs = await DeviceLog.findAll({
      include: [{ model: User, as: 'userId' }]
    });

    logger.info(`📊 [${endpoint}] Retrieved ${logs.length} device logs`);
    res.json(logs);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error fetching device logs: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// Get a device log by ID
const getDeviceLogById = async (req, res) => {
  const endpoint = 'getDeviceLogById';
  const logId = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`🔍 [${endpoint}] Fetching device log with ID: ${logId} (requested by ${userEmail})`);

  try {
    const log = await DeviceLog.findByPk(logId, {
      include: [{ model: User, as: 'userId' }]
    });

    if (!log) {
      logger.warn(`⚠️ [${endpoint}] Device log not found`, { id: logId });
      return res.status(404).json({ error: 'Log not found' });
    }

    logger.info(`✅ [${endpoint}] Device log retrieved successfully`, { id: logId });
    res.json(log);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error fetching device log: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// Delete a device log
const deleteDeviceLog = async (req, res) => {
  const endpoint = 'deleteDeviceLog';
  const logId = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`🗑️ [${endpoint}] Delete request for log ID: ${logId} (by ${userEmail})`);

  try {
    const deleted = await DeviceLog.destroy({ where: { id: logId } });

    if (!deleted) {
      logger.warn(`⚠️ [${endpoint}] Attempted to delete non-existent log`, { id: logId });
      return res.status(404).json({ error: 'Log not found' });
    }

    logger.info(`✅ [${endpoint}] Device log deleted successfully`, { id: logId });
    res.json({ message: 'Log deleted' });
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error deleting device log: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
};
