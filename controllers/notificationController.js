const { Notification } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');


// Create a new notification
exports.createNotification = async (req, res) => {
  const endpoint = 'createNotification';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`📥 [${endpoint}] Request received from ${userEmail}`, { body: req.body });

  try {
    const notification = await Notification.create(req.body);
    logger.info(`✅ [${endpoint}] Notification created successfully`, { id: notification.id, user: userEmail });
    res.status(201).json(notification);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error creating notification: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  const endpoint = 'getNotifications';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`📡 [${endpoint}] Fetching all notifications for ${userEmail}`);

  try {
    const notifications = await Notification.findAll();
    logger.info(`📊 [${endpoint}] Retrieved ${notifications.length} notifications`);
    res.json(notifications);
  } catch (err) {
    logger.error(`❌ [${endpoint}] Error fetching notifications: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};