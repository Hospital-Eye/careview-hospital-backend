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

// Get all patients, optionally filtered by status
const getPatients = async (req, res) => {
  try {
    const { status } = req.query; // e.g., ?status=Active or ?status=Discharged

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const patients = await Patient.find(filter); 
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Get a patient by MRN (including vitals)
const getPatientByMRN = async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrn: req.params.mrn });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Get latest admission and populate room & physician
    const latestAdmission = await Admission.findOne({ patientId: patient._id })
      .sort({ checkInTime: -1 })
      .populate({
        path: 'assignedRoomId',
        select: 'roomNumber unit roomType', 
      })
      .populate({
        path: 'attendingPhysicianId',
        select: 'name', 
      });

    // Fetch vitals history (populate recordedBy from Staff)
    const vitalsHistory = await Vital.find({ patientId: patient.mrn }).sort({ timestamp: -1 });
    
    const patientDetails = patient.toObject();

    if (latestAdmission) {
      patientDetails.admissionReason = latestAdmission.admissionReason;
      patientDetails.admissionDate = latestAdmission.admissionDate || latestAdmission.checkInTime;
      patientDetails.assignedRoom = latestAdmission.assignedRoomId || null;
      patientDetails.attendingPhysician = latestAdmission.attendingPhysicianId || null;
      patientDetails.currentWorkflowStage = latestAdmission.currentWorkflowStage;
      patientDetails.documentation = latestAdmission.documentation || null;
      patientDetails.carePlan = latestAdmission.carePlan || null;
    } else {
      patientDetails.admissionReason = null;
      patientDetails.admissionDate = null;
      patientDetails.assignedRoom = null;
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

// Update a patient by MRN (+ discharge patient)
const updatePatientByMRN = async (req, res) => {
  try {
    const { mrn } = req.params;
    const updateData = { ...req.body };

    // Find the patient first
    const patient = await Patient.findOne({ mrn });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // If status is being changed to Discharged
    if (updateData.status && updateData.status.toLowerCase() === "discharged") {
      updateData.dischargeDate = new Date();

      // Update latest active admission for this patient
      const latestAdmission = await Admission.findOne({ 
        patientId: patient._id, 
        status: 'Active' 
      }).sort({ checkInTime: -1 });

      if (latestAdmission) {
        latestAdmission.status = 'Completed';
        latestAdmission.dischargeDate = new Date();
        await latestAdmission.save();
      }
    }

    // Update patient data
    const updatedPatient = await Patient.findOneAndUpdate(
      { mrn },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json(updatedPatient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Delete a patient by MRN
const deletePatientByMRN = async (req, res) => {
  try {
    const deleted = await Patient.findOneAndDelete({ mrn: String(req.params.mrn) });
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
