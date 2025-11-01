const { Vital, Patient } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

// --- Create a new vital record ---
const createVital = async (req, res) => {
  logger.info('POST /vitals endpoint hit');
  logger.debug(`Request body: ${JSON.stringify(req.body)}`);

  try {
    const vital = await Vital.create(req.body);
    logger.info(`✅ Vital record created successfully (ID=${vital.id})`);
    res.status(201).json(vital);
  } catch (err) {
    logger.error(`❌ Error creating vital: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

// --- Get all vitals ---
const getVitals = async (req, res) => {
  logger.info('GET /vitals endpoint hit');

  try {
    const vitals = await Vital.findAll({
      include: [
        { model: Patient, as: 'patientId' },
        { model: Patient, as: 'recordedBy' },
      ],
    });

    logger.info(`Fetched ${vitals.length} vital records from database`);
    res.json(vitals);
  } catch (err) {
    logger.error(`❌ Error fetching vitals: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

// --- Get a vital by ID ---
const getVitalById = async (req, res) => {
  logger.info(`GET /vitals/${req.params.id} endpoint hit`);

  try {
    const vital = await Vital.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patientId' },
        { model: Patient, as: 'recordedBy' },
      ],
    });

    if (!vital) {
      logger.warn(`Vital record not found (ID=${req.params.id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    logger.info(`✅ Fetched vital record successfully (ID=${vital.id})`);
    res.json(vital);
  } catch (err) {
    logger.error(`❌ Error fetching vital ID=${req.params.id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

// --- Update a vital ---
const updateVital = async (req, res) => {
  logger.info(`PUT /vitals/${req.params.id} endpoint hit`);
  logger.debug(`Update data: ${JSON.stringify(req.body)}`);

  try {
    const vital = await Vital.findByPk(req.params.id);
    if (!vital) {
      logger.warn(`Vital record not found for update (ID=${req.params.id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    await vital.update(req.body);
    logger.info(`✅ Vital record updated successfully (ID=${vital.id})`);
    res.json(vital);
  } catch (err) {
    logger.error(`❌ Error updating vital ID=${req.params.id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

// --- Delete a vital ---
const deleteVital = async (req, res) => {
  logger.info(`DELETE /vitals/${req.params.id} endpoint hit`);

  try {
    const deleted = await Vital.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      logger.warn(`Attempted to delete non-existent vital (ID=${req.params.id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    logger.info(`🗑️ Vital record deleted successfully (ID=${req.params.id})`);
    res.json({ message: 'Vital deleted' });
  } catch (err) {
    logger.error(`❌ Error deleting vital ID=${req.params.id}: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

// --- Get Vitals History by Patient ID (for Line Chart) ---
const getVitalsHistoryByPatientId = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    logger.info(`📊 [getVitalsHistoryByPatientId] Request received for patientId=${patientId}`);

    const patientExists = await Patient.findByPk(patientId);
    if (!patientExists) {
      logger.warn(`⚠️ [getVitalsHistoryByPatientId] Patient not found for patientId=${patientId}`);
      return res.status(404).json({ error: 'Patient not found for this vitals history.' });
    }

    // Get optional date filters
    const { startDate, endDate } = req.query;
    logger.info(`📅 [getVitalsHistoryByPatientId] Date range filters - startDate=${startDate || 'none'}, endDate=${endDate || 'none'}`);

    let query = { patientId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp[Op.gte] = new Date(startDate);
      if (endDate) query.timestamp[Op.lte] = new Date(endDate);
    }

    const vitals = await Vital.findAll({
      where: query,
      order: [['timestamp', 'ASC']],
      include: [{ model: Patient, as: 'recordedBy' }]
    });

    logger.info(`✅ [getVitalsHistoryByPatientId] Retrieved ${vitals.length} vitals for patientId=${patientId}`);
    res.status(200).json(vitals);

  } catch (err) {
    logger.error(`❌ [getVitalsHistoryByPatientId] Error fetching vitals history for patientId=${req.params.patientId}: ${err.message}`);
    res.status(500).json({ error: 'Server error: Unable to fetch vitals history.' });
  }
};

module.exports = {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital,
  getVitalsHistoryByPatientId
};
