const { Vital, Patient, Staff } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new vital record
const createVital = async (req, res) => {
  const endpoint = 'createVital';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create vital record from user: ${userEmail}`);
  
  try {
    const { patientId, recordedBy } = req.body;

    //Validate patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found (ID=${patientId})`);
      return res.status(404).json({ error: "Patient not found" });
    }

    //Validate staff exists
    const recorder = await Staff.findByPk(recordedBy);
    if (!recorder) {
      logger.warn(`[${endpoint}] Staff member not found (ID=${recordedBy})`);
      return res.status(404).json({ error: "Recorder (staff) not found" });
    }

    //Create record
    const vital = await Vital.create(req.body);

    logger.info(`[${endpoint}] Vital record created successfully (ID=${vital.id})`);

    //Return with associations loaded
    const responseVital = await Vital.findByPk(vital.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Staff, as: 'recorder' }
      ]
    });

    return res.status(201).json(responseVital);

  } catch (err) {
    logger.error(`[${endpoint}] Error creating vital: ${err.stack}`);
    return res.status(500).json({ error: "Error creating vital" });
  }
};


//Get all vitals
const getVitals = async (req, res) => {
  const endpoint = 'getVitals';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all vital records received from user: ${userEmail}`);

  try {
    const vitals = await Vital.findAll({
    include: [
      { model: Patient, as: 'patient' },
      { model: Staff, as: 'recorder' },
    ],
  });

    res.json(vitals);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching vitals: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

//Get a vital by ID
const getVitalById = async (req, res) => {
  const endpoint = 'getVitalById';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to view vital record having id: ${id} received from user: ${userEmail}`);

  try {
    const vital = await Vital.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Staff, as: 'recorder' },
      ],
    });


    if (!vital) {
      logger.warn(`[${endpoint}] Vital record not found (ID=${id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    logger.info(`[${endpoint}] Fetched vital record successfully (ID=${id})`);
    res.json(vital);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching vital ID=${id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Update a vital
const updateVital = async (req, res) => {
  const endpoint = 'updateVital';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to update vital record having id: ${id} received from user: ${userEmail}`);
  

  try {
    const vital = await Vital.findByPk(req.params.id);
    if (!vital) {
      logger.warn(`[${endpoint}] Vital record not found for update (ID=${id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    await vital.update(req.body);
    logger.info(`[${endpoint}] Vital record updated successfully (ID=${id})`);
    res.json(vital);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating vital ID=${id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Delete a vital
const deleteVital = async (req, res) => {
  const endpoint = 'deleteVital';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to update delete vital record having id: ${id} received from user: ${userEmail}`);
  
  try {
    const deleted = await Vital.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      logger.warn(`[${endpoint}] Attempted to delete non-existent vital (ID=${id})`);
      return res.status(404).json({ error: 'Vital not found' });
    }

    logger.info(`[${endpoint}] Vital record deleted successfully (ID=${id})`);
    res.json({ message: 'Vital deleted' });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting vital ID=${id}: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

//Get Vitals History by Patient ID
const getVitalsHistoryByPatientId = async (req, res) => {

  const endpoint = 'getVitalsHistoryByPatientId';
  const userEmail = req.user?.email || 'unknown';
  const patientId = req.params.patientId;

  logger.info(`[${endpoint}] Request to view vital records of patient ${patientId} received from user: ${userEmail}`);
  try {

    const patientExists = await Patient.findByPk(patientId);
    if (!patientExists) {
      logger.warn(`[${endpoint}] Patient not found for patientId=${patientId}`);
      return res.status(404).json({ error: 'Patient not found for this vitals history.' });
    }

    // Get optional date filters
    const { startDate, endDate } = req.query;

    let query = { patientId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp[Op.gte] = new Date(startDate);
      if (endDate) query.timestamp[Op.lte] = new Date(endDate);
    }

    const vitals = await Vital.findAll({
    where: query,
    order: [['timestamp', 'ASC']],
    include: [
      { model: Patient, as: 'patient' },
      { model: Staff, as: 'recorder' }
    ],
  });

    logger.info(`[${endpoint}] Retrieved ${vitals.length} vitals for patientId=${patientId}`);
    res.status(200).json(vitals);

  } catch (err) {
    logger.error(`[${endpoint}] Error fetching vitals history for patientId=${req.params.patientId}: ${err.message}`);
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
