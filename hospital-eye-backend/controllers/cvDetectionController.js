const CVDetection = require('../models/CVDetection');

// Create a new detection
const createDetection = async (req, res) => {
  try {
    const detection = new CVDetection(req.body);
    await detection.save();
    res.status(201).json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all detections
const getDetections = async (req, res) => {
  try {
    const detections = await CVDetection.find().populate('personId triggeredAlertId');
    res.json(detections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get detection by ID
const getDetectionById = async (req, res) => {
  try {
    const detection = await CVDetection.findById(req.params.id).populate('personId triggeredAlertId');
    if (!detection) return res.status(404).json({ error: 'Detection not found' });
    res.json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update detection
const updateDetection = async (req, res) => {
  try {
    const updated = await CVDetection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete detection
const deleteDetection = async (req, res) => {
  try {
    await CVDetection.findByIdAndDelete(req.params.id);
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
