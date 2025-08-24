const AnalyticsEvent = require('../models/AnalyticsEvent');

exports.createEvent = async (req, res) => {
  try {
    const event = new AnalyticsEvent(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await AnalyticsEvent.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};