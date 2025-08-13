const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const Admission = require('../models/Admissions');

// Create a new patient
const createPatient = async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all patients
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a patient by MRN (including vitals)
const getPatientByMRN = async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrn: req.params.mrn });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Get latest admission
    const latestAdmission = await Admission.findOne({ patientId: String(patient._id) })
      .sort({ checkInTime: -1 })
      .populate('assignedRoomId')
      .populate('attendingPhysicianId');

    // Fetch vitals history (populate recordedBy from Staff)
    const vitalsHistory = await Vital.find({ patientId: patient.mrn }).sort({ timestamp: -1 });
    
    const patientDetails = patient.toObject();

    if (latestAdmission) {
      patientDetails.admissionReason = latestAdmission.admissionReason;
      patientDetails.admissionDate = latestAdmission.admissionDate || latestAdmission.checkInTime;
      patientDetails.assignedRoom = latestAdmission.assignedRoomId || null;
      patientDetails.attendingPhysician = latestAdmission.attendingPhysicianId || null;
      patientDetails.currentWorkflowStage = latestAdmission.currentWorkflowStage;
      patientDetails.documentation = latestAdmission.documentation;
      patientDetails.carePlan = latestAdmission.carePlan;
    } else {
      patientDetails.admissionReason = null;
      patientDetails.admissionDate = null;
      patientDetails.assignedRoomId = null;
      patientDetails.attendingPhysician = null;
      patientDetails.currentWorkflowStage = 'Not Admitted';
      patientDetails.documentation = null;
      patientDetails.carePlan = null;
    }

    patientDetails.vitalsHistory = vitalsHistory;

    res.json(patientDetails);
  } catch (err) {
    console.error('Error fetching patient by MRN with vitals and admission details:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Delete a patient by MRN
const deletePatientByMRN = async (req, res) => {
  try {
    const deleted = await Patient.findOneAndDelete({ mrn: req.params.mrn });
    if (!deleted) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
};
