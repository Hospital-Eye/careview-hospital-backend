const { DeviceLog, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const createDeviceLog = async (req, res) => {
  try {
    const log = await DeviceLog.create(req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getDeviceLogs = async (req, res) => {
  try {
    const logs = await DeviceLog.findAll({
      include: [{ model: User, as: 'userId' }]
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDeviceLogById = async (req, res) => {
  try {
    const log = await DeviceLog.findByPk(req.params.id, {
      include: [{ model: User, as: 'userId' }]
    });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteDeviceLog = async (req, res) => {
  try {
    const deleted = await DeviceLog.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createDeviceLog,
  getDeviceLogs,
  getDeviceLogById,
  deleteDeviceLog
};
