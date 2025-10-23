const { Vital, Patient } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const createVital = async (req, res) => {
  try {
    const vital = await Vital.create(req.body);
    res.status(201).json(vital);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getVitals = async (req, res) => {
  try {
    const vitals = await Vital.findAll({
      include: [
        { model: Patient, as: 'patientId' },
        { model: Patient, as: 'recordedBy' }
      ]
    });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVitalById = async (req, res) => {
  try {
    const vital = await Vital.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patientId' },
        { model: Patient, as: 'recordedBy' }
      ]
    });
    if (!vital) return res.status(404).json({ error: 'Vital not found' });
    res.json(vital);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateVital = async (req, res) => {
  try {
    const vital = await Vital.findByPk(req.params.id);
    if (!vital) return res.status(404).json({ error: 'Vital not found' });

    await vital.update(req.body);
    res.json(vital);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteVital = async (req, res) => {
  try {
    const deleted = await Vital.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Vital not found' });
    res.json({ message: 'Vital deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//for displaying line chart
const getVitalsHistoryByPatientId = async (req, res) => {
  try {
    const patientId = req.params.patientId; // Get patientId from the URL parameter

    const patientExists = await Patient.findByPk(patientId);
    if (!patientExists) {
        return res.status(404).json({ error: 'Patient not found for this vitals history.' });
    }

    // Get date range from query parameters
    const { startDate, endDate } = req.query;

    let query = { patientId: patientId }; // Start query with patientId

    // Add timestamp filtering if startDate or endDate are provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        query.timestamp[Op.lte] = new Date(endDate);
      }
    }

    // Fetch vitals, sort by timestamp ascending for chart plotting
    const vitals = await Vital.findAll({
      where: query,
      order: [['timestamp', 'ASC']], // Sort ascending by timestamp for charting
      include: [{ model: Patient, as: 'recordedBy' }]
    });

    res.status(200).json(vitals); // Send the filtered and sorted vitals data
  } catch (err) {
    console.error('Error fetching vitals history by patient ID:', err);
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
