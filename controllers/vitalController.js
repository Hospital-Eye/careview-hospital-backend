const Vital = require('../models/Vital');
<<<<<<< HEAD
=======
const Patient = require('../models/Patient');
>>>>>>> dev

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

<<<<<<< HEAD
=======
//for displaying line chart
const getVitalsHistoryByPatientId = async (req, res) => {
  try {
    const patientId = req.params.patientId; // Get patientId from the URL parameter

    const patientExists = await Patient.findById(patientId);
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
        query.timestamp.$gte = new Date(startDate); 
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);   
      }
    }

    // Fetch vitals, sort by timestamp ascending for chart plotting
    const vitals = await Vital.find(query)
                               .sort({ timestamp: 1 }) // Sort ascending by timestamp for charting
                               .populate('recordedBy'); 

    res.status(200).json(vitals); // Send the filtered and sorted vitals data
  } catch (err) {
    console.error('Error fetching vitals history by patient ID:', err);
    res.status(500).json({ error: 'Server error: Unable to fetch vitals history.' });
  }
};

>>>>>>> dev
module.exports = {
  createVital,
  getVitals,
  getVitalById,
  updateVital,
<<<<<<< HEAD
  deleteVital
=======
  deleteVital,
  getVitalsHistoryByPatientId
>>>>>>> dev
};
