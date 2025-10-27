const { ComplianceAlert } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// Create a new alert
const createAlert = async (req, res) => {
  try {
    const alert = await ComplianceAlert.create(req.body);
    res.status(201).json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all alerts
const getAlerts = async (req, res) => {
  try {
    const alerts = await ComplianceAlert.findAll({
    include: [
      { model: require('../models').AnalyticsEvent, as: 'sourceEvent' },
      { model: require('../models').Staff, as: 'recipientStaff' },
      { model: require('../models').Patient, as: 'associatedPatient' },
      { model: require('../models').Room, as: 'associatedRoom' }
    ]
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get alert by ID
const getAlertById = async (req, res) => {
  try {
    const alert = await ComplianceAlert.findByPk(req.params.id, {
      include: [
        { model: require('../models').AnalyticsEvent, as: 'source.eventId' },
        { model: require('../models').Staff, as: 'recipients.staffId' },
        { model: require('../models').Patient, as: 'associatedIds.patientId' },
        { model: require('../models').Room, as: 'associatedIds.roomId' }
      ]
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update alert
const updateAlert = async (req, res) => {
  try {
    const alert = await ComplianceAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await alert.update(req.body);
    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete alert
const deleteAlert = async (req, res) => {
  try {
    const deleted = await ComplianceAlert.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert
};
