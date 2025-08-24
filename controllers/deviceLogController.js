const DeviceLog = require('../models/DeviceLog');

const createDeviceLog = async (req, res) => {
  try {
    const log = new DeviceLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getDeviceLogs = async (req, res) => {
  try {
    const logs = await DeviceLog.find().populate('userId');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDeviceLogById = async (req, res) => {
  try {
    const log = await DeviceLog.findById(req.params.id).populate('userId');
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteDeviceLog = async (req, res) => {
  try {
    await DeviceLog.findByIdAndDelete(req.params.id);
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
