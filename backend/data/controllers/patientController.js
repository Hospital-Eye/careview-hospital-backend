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

    // Get the latest admission details for this patient
    const latestAdmission = await Admission.findOne({ patientId: patient._id })
                                            .sort({ checkInTime: -1 })
                                            .populate('assignedRoomId')
                                            .populate('attendingPhysicianId');

    // Fetch all Vitals associated with this Patient ID 
    const vitalsHistory = await Vital.find({ patientId: patient._id })
                                       .sort({ timestamp: -1 }) // Sort by newest first
                                       .populate('recordedBy'); 

    // Combine patient data with vitals history 
    const patientDetails = patient.toObject();

    // Clean up the object to make it flatter for the frontend if needed
    if (patientDetails.currentAdmissionId) {
        patientDetails.admissionReason = patientDetails.currentAdmissionId.admissionReason;
        patientDetails.admissionDate = patientDetails.currentAdmissionId.admissionDate;
        patientDetails.assignedRoom = patientDetails.currentAdmissionId.assignedRoomId;
        patientDetails.attendingPhysician = patientDetails.currentAdmissionId.attendingPhysicianId;
        patientDetails.currentWorkflowStage = patientDetails.currentAdmissionId.currentWorkflowStage;
        patientDetails.documentation = patientDetails.currentAdmissionId.documentation;
        patientDetails.carePlan = patientDetails.currentAdmissionId.carePlan;
        
        // Remove the original nested object for clarity if desired
        delete patientDetails.currentAdmissionId; 
    } else {
        // Set default values if no current admission exists
        patientDetails.admissionReason = null;
        patientDetails.admissionDate = null;
        patientDetails.assignedRoom = null;
        patientDetails.attendingPhysician = null;
        patientDetails.currentWorkflowStage = 'Not Admitted';
        patientDetails.documentation = null;
        patientDetails.carePlan = null;
    }
    // Embed vitals history
    patientDetails.vitalsHistory = vitalsHistory;

    res.json(patientDetails); // Send combined data
  } catch (err) {
    console.error('Error fetching patient by MRN with vitals and admission details:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a patient by MRN
const updatePatientByMRN = async (req, res) => {
  try {
    const updated = await Patient.findOneAndUpdate(
      { mrn: req.params.mrn },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Patient not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
