const { ComplianceAlert, AnalyticsEvent, Staff, Patient, Room } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

//Create a new alert
const createAlert = async (req, res) => {
  const endpoint = 'createAlert';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[ComplianceAlert] Incoming request to create compliance alert from user: ${userEmail}`);

  try {
    const alert = await ComplianceAlert.create(req.body);
    logger.info(`[ComplianceAlert] Alert created successfully`, { alertId: alert.id });
    res.status(201).json(alert);
  } catch (err) {
    logger.error(`[ComplianceAlert] Error creating alert: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(400).json({ error: err.message });
  }
};

//Get all alerts
const getAlerts = async (req, res) => {
  const endpoint = 'getAlerts';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[ComplianceAlert] Request to view all compliance alerts from user: ${userEmail}`);

  try {
    const alerts = await ComplianceAlert.findAll({
      include: [
        { model: AnalyticsEvent, as: 'sourceEvent' },
        { model: Staff, as: 'recipientStaff' },
        { model: Patient, as: 'associatedPatient' },
        { model: Room, as: 'associatedRoom' },
      ],
    });

    res.json(alerts);
  } catch (err) {
    logger.error(`[ComplianceAlert] Error fetching alerts: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(500).json({ error: err.message });
  }
};

//Get alert by ID
const getAlertById = async (req, res) => {
  const endpoint = 'getAlertById';
  const userEmail = req.user?.email || 'unknown';
  const alertId = req.params.id;

  logger.info(`[ComplianceAlert] Request from ${userEmail} for alert ID ${alertId}`);

  try {
    const alert = await ComplianceAlert.findByPk(alertId, {
      include: [
        { model: AnalyticsEvent, as: 'sourceEvent' },
        { model: Staff, as: 'recipientStaff' },
        { model: Patient, as: 'associatedPatient' },
        { model: Room, as: 'associatedRoom' },
      ],
    });

    if (!alert) {
      logger.warn(`[${endpoint}] Alert not found`, { alertId });
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`[ComplianceAlert] Fetched alert successfully`, { alertId });
    res.json(alert);
  } catch (err) {
    logger.error(`[ComplianceAlert] Error fetching alert: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(400).json({ error: err.message });
  }
};

//Update alert
const updateAlert = async (req, res) => {
  const endpoint = 'updateAlert';
  const userEmail = req.user?.email || 'unknown';
  const alertId = req.params.id;

  logger.info(`[ComplianceAlert] Request to update compliance alert from ${userEmail}`, {
    alertId,
    updateBody: req.body,
  });

  try {
    const alert = await ComplianceAlert.findByPk(alertId);
    if (!alert) {
      logger.warn(`[ComplianceAlert] Alert not found`, { alertId });
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update(req.body);
    logger.info(`[ComplianceAlert] Alert updated successfully having id:`, { alertId });
    res.json(alert);
  } catch (err) {
    logger.error(`[ComplianceAlert] Error updating alert: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(400).json({ error: err.message });
  }
};

//Delete alert
const deleteAlert = async (req, res) => {
  const endpoint = 'deleteAlert';
  const userEmail = req.user?.email || 'unknown';
  const alertId = req.params.id;

  logger.info(`[ComplianceAlert] Request to delete compliance alert from user: ${userEmail}`, { alertId });

  try {
    const deleted = await ComplianceAlert.destroy({ where: { id: alertId } });
    if (!deleted) {
      logger.warn(`[ComplianceAlert] Alert not found`, { alertId });
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`[ComplianceAlert] Alert deleted successfully`, { alertId });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    logger.error(`[ComplianceAlert] Error deleting alert: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
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
