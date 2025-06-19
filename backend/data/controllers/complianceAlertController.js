const ComplianceAlert = require('../models/ComplianceAlert');

exports.createAlert = async (req, res) => {
  try {
    const alert = new ComplianceAlert(req.body);
    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await ComplianceAlert.find();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};