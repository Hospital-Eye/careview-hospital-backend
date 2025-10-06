const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const Admission = require('../models/Admission');

// Create a new patient
const User = require('../models/User');

const createPatient = async (req, res) => {
  try {
    let emailId = req.body.emailId;
    if (emailId) {
      // Check if email exists in User collection
      const existingUser = await User.findOne({ email: emailId });
      if (existingUser) {
        // Use the existing email
        req.body.emailId = existingUser.email;
      }
      // else, keep the new entry as provided
    }
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

    // Build admission filter
    const admissionFilter = {};
    if (status) {
      admissionFilter.status = status;
    }

    // Find all patients and populate admissions
    const patients = await Patient.find()
      .lean()
      .populate({
        path: "admissions",
        match: admissionFilter,
        populate: [
          { path: "room", select: "roomNumber unit roomType" },
          { path: "attendingPhysicianId", select: "name" }
        ]
      });

    // Flatten structure: add separate fields from latest admission
    const reshapedPatients = patients.map(p => {
      const latestAdmission = p.admissions && p.admissions.length > 0
        ? p.admissions[p.admissions.length - 1] // pick latest admission
        : null;

      return {
        ...p,
        // separate room fields
        roomId: latestAdmission?.room?._id || null,
        roomNumber: latestAdmission?.room?.roomNumber || null,
        roomUnit: latestAdmission?.room?.unit || null,
        roomType: latestAdmission?.room?.roomType || null,

        // other useful fields
        attendingPhysicianName: latestAdmission?.attendingPhysicianId?.name || null,
        admissionStatus: latestAdmission?.status || null,
      };
    });

    res.json(reshapedPatients);
  } catch (err) {
    console.error("Error fetching patients with admissions:", err);
    res.status(500).json({ error: err.message });
  }
};


// Get a patient by MRN (including latest admission + vitals)
const getPatientByMRN = async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrn: req.params.mrn });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Get latest admission and populate room & physician
    const latestAdmission = await Admission.findOne({ patientId: patient._id })
      .sort({ checkInTime: -1 })
      .populate({
        path: 'room',
        select: 'roomNumber unit roomType',
      })
      .populate({
        path: 'attendingPhysicianId',
        select: 'name',
      });

    // Fetch vitals history (latest first)
    const vitalsHistory = await Vital.find({ mrn: patient.mrn })
      .sort({ timestamp: -1 })
      .populate('recordedBy', 'name');

    // Combine details
    const patientDetails = patient.toObject();

    if (latestAdmission) {
      patientDetails.admissionReason = latestAdmission.admissionReason;
      patientDetails.admissionDate = latestAdmission.admissionDate || latestAdmission.checkInTime;
      patientDetails.assignedRoom = latestAdmission.room || null;
      patientDetails.attendingPhysician = latestAdmission.attendingPhysicianId || null;
      patientDetails.currentWorkflowStage = latestAdmission.currentWorkflowStage;
      patientDetails.documentation = latestAdmission.documentation || null;
      patientDetails.carePlan = latestAdmission.carePlan || null;
      patientDetails.admissionStatus = latestAdmission.status; // NEW: track if Active/Discharged
    } else {
      patientDetails.admissionReason = null;
      patientDetails.admissionDate = null;
      patientDetails.assignedRoom = null;
      patientDetails.attendingPhysician = null;
      patientDetails.currentWorkflowStage = 'Not Admitted';
      patientDetails.documentation = null;
      patientDetails.carePlan = null;
      patientDetails.admissionStatus = 'None';
    }

    patientDetails.vitalsHistory = vitalsHistory;

    res.json(patientDetails);
  } catch (err) {
    console.error('Error fetching patient by MRN with vitals and admission details:', err);
    res.status(500).json({ error: 'Server error: Error fetching patient by MRN with vitals and admission details' });
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
      updateData.status = "Discharged";
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
        { mrn: mrn },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json(updatedPatient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: Unable to update patient" });
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
