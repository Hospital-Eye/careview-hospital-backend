const { ComplianceAlert, AnalyticsEvent, Staff, Patient, Room } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new alert
const createAlert = async (req, res) => {
  const endpoint = "createComplianceAlert";

  try {
    const user = req.user;
    const role = user.role.toLowerCase();

    let organizationId = user.organizationId;
    let clinicId;

    //Admin: org and clinic from req.user
    if (role === "admin") {
      clinicId = user.clinicId;

      if (!clinicId) {
        return res.status(400).json({
          error: "Admin user does not have an assigned clinicId"
        });
      }

    } else if (["manager", "doctor", "nurse"].includes(role)) {
      //Other roles: org from req.user, clinic from req.body
      clinicId = req.body.clinicId;

      if (!clinicId) {
        return res.status(400).json({
          error: "clinicId is required for this user role"
        });
      }
      
    } else {
      return res.status(403).json({
        error: `Role '${role}' not allowed to create compliance alerts`
      });
    }

    // Create the compliance alert
    const alert = await ComplianceAlert.create({
      title: req.body.title,
      message: req.body.message,
      type: req.body.type,
      organizationId: organizationId,
      clinicId: clinicId,
      createdBy: user.id
    });

    return res.status(201).json(alert);

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return res.status(500).json({ error: "Server error creating compliance alert" });
  }
};


//Get all alerts
const getAlerts = async (req, res) => {
  const endpoint = 'getAlerts';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all compliance alerts from user: ${userEmail}`);

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
    logger.error(`[${endpoint}] Error fetching alerts: ${err.message}`, {
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

  logger.info(`[${endpoint}] Request from ${userEmail} for alert ID ${alertId}`);

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

    logger.info(`[${endpoint}] Fetched alert successfully`, { alertId });
    res.json(alert);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching alert: ${err.message}`, {
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

  logger.info(`[${endpoint}] Request to update compliance alert from ${userEmail}`, {
    alertId,
    updateBody: req.body,
  });

  try {
    const alert = await ComplianceAlert.findByPk(alertId);
    if (!alert) {
      logger.warn(`[${endpoint}] Alert not found`, { alertId });
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update(req.body);
    logger.info(`[${endpoint}] Alert updated successfully having id:`, { alertId });
    res.json(alert);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating alert: ${err.message}`, {
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

  logger.info(`[${endpoint}] Request to delete compliance alert from user: ${userEmail}`, { alertId });

  try {
    const deleted = await ComplianceAlert.destroy({ where: { id: alertId } });
    if (!deleted) {
      logger.warn(`[${endpoint}] Alert not found`, { alertId });
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info(`[${endpoint}] Alert deleted successfully`, { alertId });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting alert: ${err.message}`, {
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
