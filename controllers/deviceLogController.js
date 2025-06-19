const DeviceLog = require('../models/DeviceLog');

exports.createLog = async (req, res) => {
  try {
    const log = new DeviceLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await DeviceLog.find();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
