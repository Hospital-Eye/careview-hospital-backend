const { AnalyticsEvent } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

exports.createEvent = async (req, res) => {
  try {
    const event = await AnalyticsEvent.create(req.body);
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await AnalyticsEvent.findAll();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
