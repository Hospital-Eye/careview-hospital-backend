const { AnalyticsEvent } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new analytics event
exports.createEvent = async (req, res) => {
  const { body, user } = req;
  const userEmail = user?.email || 'unknown';
  const endpoint = 'createEvent';

  logger.info(`[${endpoint}] Incoming request for creating event from ${userEmail}`, { body });

  try {
    const event = await AnalyticsEvent.create(body);
    logger.info(`[${endpoint}] Analytics event created successfully`, { eventId: event.id });
    res.status(201).json(event);
  } catch (err) {
    logger.error(`[${endpoint}] Error creating event: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(400).json({ error: err.message });
  }
};

//Get all analytics events
exports.getEvents = async (req, res) => {
  const { user } = req;
  const userEmail = user?.email || 'unknown';
  const endpoint = 'getEvents';

  logger.info(`[${endpoint}] Incoming request for viewing all events from ${userEmail}`);

  try {
    const events = await AnalyticsEvent.findAll();
    logger.info(`[${endpoint}] Retrieved ${events.length} events`);
    res.json(events);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching events: ${err.message}`, {
      stack: err.stack,
      user: userEmail,
    });
    res.status(500).json({ error: err.message });
  }
};