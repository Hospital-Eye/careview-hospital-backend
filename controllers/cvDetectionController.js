const { CVDetection } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new detection
const createDetection = async (req, res) => {
  const endpoint = 'createDetection';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create CV detection from user: ${userEmail}`);

  try {
    const detection = await CVDetection.create(req.body);
    logger.info(`[${endpoint}] CV detection created successfully`, { detectionId: detection.id });
    res.status(201).json(detection);
  } catch (err) {
    logger.error(`[${endpoint}] Error creating CV detection: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

//Get all detections
const getDetections = async (req, res) => {
  const endpoint = 'getDetections';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to view all CV detections from user: ${userEmail}`);

  try {
    const detections = await CVDetection.findAll({
      include: [
        { model: require('../models').Patient, as: 'personId' },
        { model: require('../models').ComplianceAlert, as: 'triggeredAlertId' }
      ]
    });
    logger.info(`[${endpoint}] Retrieved ${detections.length} CV detections`);
    res.json(detections);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching CV detections: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

//Get detection by ID
const getDetectionById = async (req, res) => {
  const endpoint = 'getDetectionById';
  const userEmail = req.user?.email || 'unknown';
  const detectionId = req.params.id;

  logger.info(`[${endpoint}] Request from ${userEmail} for CV detection ID ${detectionId}`);  

  try {
    const detection = await CVDetection.findByPk(req.params.id, {
      include: [
        { model: require('../models').Patient, as: 'personId' },
        { model: require('../models').ComplianceAlert, as: 'triggeredAlertId' }
      ]
    });
    if (!detection) return res.status(404).json({ error: 'Detection not found' });
    logger.info(`[${endpoint}] CV detection ID ${detectionId} retrieved successfully`);
    res.json(detection);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching CV detection ID ${detectionId}: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

//Update detection
const updateDetection = async (req, res) => {
  const endpoint = 'updateDetection';
  const userEmail = req.user?.email || 'unknown';
  const detectionId = req.params.id;

  logger.info(`[${endpoint}] Incoming request to update CV detection ID ${detectionId} from user: ${userEmail}`);

  try {
    const detection = await CVDetection.findByPk(req.params.id);
    if (!detection) return res.status(404).json({ error: 'Detection not found' });

    await detection.update(req.body);
    logger.info(`[${endpoint}] CV detection ID ${detectionId} updated successfully`);
    res.json(detection);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating CV detection ID ${detectionId}: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

//Delete detection
const deleteDetection = async (req, res) => {
  const endpoint = 'deleteDetection';
  const userEmail = req.user?.email || 'unknown';
  const detectionId = req.params.id;

  logger.info(`[${endpoint}] Incoming request to delete CV detection ID ${detectionId} from user: ${userEmail}`);

  try {
    const deleted = await CVDetection.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Detection not found' });
    logger.info(`[${endpoint}] CV detection ID ${detectionId} deleted successfully`);
    res.json({ message: 'Detection deleted' });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting CV detection ID ${detectionId}: ${err.message}`);
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
