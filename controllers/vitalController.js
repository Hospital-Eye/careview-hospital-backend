const Vital = require('../models/Vital');

const createVital = async (req, res) => {
  try {
    const vital = new Vital(req.body);
    await vital.save();
    res.status(201).json(vital);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getVitals = async (req, res) => {
  try {
    const vitals = await Vital.find().populate('patientId recordedBy');
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVitalById = async (req, res) => {
  try {
    const vital = await Vital.findById(req.params.id).populate('patientId recordedBy');
    if (!vital) return res.status(404).json({ error: 'Vital not found' });
    res.json(vital);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateVital = async (req, res) => {
  try {
    const updated = await Vital.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteVital = async (req, res) => {
  try {
    await Vital.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vital deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
  deleteVital
};
