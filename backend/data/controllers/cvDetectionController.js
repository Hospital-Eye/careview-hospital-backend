const CVDetection = require('../models/CVDetection');

exports.createDetection = async (req, res) => {
  try {
    const detection = new CVDetection(req.body);
    await detection.save();
    res.status(201).json(detection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDetections = async (req, res) => {
  try {
    const detections = await CVDetection.find();
    res.json(detections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
