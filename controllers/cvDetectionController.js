const { CVDetection } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// Create a new detection
const createDetection = async (req, res) => {
  try {
    const detection = await CVDetection.create(req.body);
    res.status(201).json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all detections
const getDetections = async (req, res) => {
  try {
    const detections = await CVDetection.findAll({
      include: [
        { model: require('../models').Patient, as: 'personId' },
        { model: require('../models').ComplianceAlert, as: 'triggeredAlertId' }
      ]
    });
    res.json(detections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get detection by ID
const getDetectionById = async (req, res) => {
  try {
    const detection = await CVDetection.findByPk(req.params.id, {
      include: [
        { model: require('../models').Patient, as: 'personId' },
        { model: require('../models').ComplianceAlert, as: 'triggeredAlertId' }
      ]
    });
    if (!detection) return res.status(404).json({ error: 'Detection not found' });
    res.json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update detection
const updateDetection = async (req, res) => {
  try {
    const detection = await CVDetection.findByPk(req.params.id);
    if (!detection) return res.status(404).json({ error: 'Detection not found' });

    await detection.update(req.body);
    res.json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete detection
const deleteDetection = async (req, res) => {
  try {
    const deleted = await CVDetection.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Detection not found' });
    res.json({ message: 'Detection deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createDetection,
  getDetections,
  getDetectionById,
  updateDetection,
  deleteDetection
};
