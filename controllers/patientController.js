const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const Admission = require('../models/Admission');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Clinic = require('../models/Clinic');

//create patient with automatic room assignment based on availability and patient needs, and document upload to GCS

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Init GCS client
const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// ----------------- Controller -----------------
const createPatient = async (req, res) => {
  try {
    const { emailId, clinicId: bodyClinicId, name, dob, gender } = req.body;
    let userId;

    // Ensure we have email to identify/create a user
    if (!emailId) {
      return res.status(400).json({ error: "Email is required to create a patient." });
    }

    // Check if user already exists
    let user = await User.findOne({ email: emailId });

    if (user) {
      userId = user._id;
      req.body.emailId = user.email;
    } else {
      // Create a new user with role = patient
      user = new User({
        name: name || "Unknown",
        email: emailId,
        role: "patient",
        organizationId: req.user.organizationId,
        clinicIds: [],
      });

      await user.save();
      userId = user._id;
    }

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinic;
    let clinicId;

    if (role === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }

      clinic = await Clinic.findOne({
        $or: [{ clinicId: bodyClinicId }, { _id: bodyClinicId }],
        organizationId: userOrgId,
      });

      if (!clinic) {
        return res.status(404).json({ error: "Clinic not found" });
      }

      clinicId = clinic.clinicId;
    } else if (role === "manager") {
      clinic = await Clinic.findOne({ _id: userClinicId });
      if (!clinic) {
        return res.status(404).json({ error: "Assigned clinic not found" });
      }

      clinicId = clinic.clinicId;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    // Prevent duplicate patient linked to the same user
    const existingPatient = await Patient.findOne({ userId });
    if (existingPatient) {
      return res.status(200).json(existingPatient);
    }

    // ----------------- Auto-generate MRN -----------------
    // Convert clinicId like "newhope-1" to "NEW1"
    function clinicPrefix(clinicId) {
      const parts = clinicId.split("-");
      const name = parts[0].substring(0, 3).toUpperCase(); 
      const number = parts[1] || "1";                      
      return `${name}${number}`;                           
    }

    // Inside createPatient controller, after resolving clinicId:
    const prefix = clinicPrefix(clinic.clinicId);

    // Count patients for this clinic
    const count = await Patient.countDocuments({ clinicId: clinic.clinicId });
    const nextNumber = 1000 + count + 1; // Start at 1001

    // Format MRN
    const mrn = `${prefix}-${nextNumber}`;

    // Create patient record
    const patient = new Patient({
      ...req.body,
      userId,
      organizationId: userOrgId,
      clinicId,
      mrn, // ✅ system-generated
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    console.error("Error creating patient:", err);
    res.status(400).json({ error: err.message });
  }
};


// Get all patients, optionally filtered by status
const getPatients = async (req, res) => {
  try {
    const { status } = req.query; // e.g., ?status=Active or ?status=Discharged

    // Pull org/clinic from JWT
    const userOrgId = req.user.organizationId;
    const userClinicId = req.user.clinicId || null;

    if (!userOrgId || !userClinicId) {
      return res.status(403).json({ error: "Not authorized: missing org/clinic assignment" });
    }

    // Build base filter by org + clinics
    const patientFilter = {
      organizationId: userOrgId,
      clinicId: userClinicId
    };

    // Build admission filter
    const admissionFilter = {};
    if (status) {
      admissionFilter.status = status;
    }

    // Find patients for this org+clinic only
    const patients = await Patient.find(patientFilter)
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
        ? p.admissions[p.admissions.length - 1]
        : null;

      return {
        ...p,
        roomId: latestAdmission?.room?._id || null,
        roomNumber: latestAdmission?.room?.roomNumber || null,
        roomUnit: latestAdmission?.room?.unit || null,
        roomType: latestAdmission?.room?.roomType || null,
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


// Get a patient by MRN (including admission history + vitals)
const getPatientByMRN = async (req, res) => {
  try {
    const patient = await Patient.findOne({ mrn: req.params.mrn });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // ✅ Fetch ALL admissions for this patient, newest first
    const admissions = await Admission.find({ patientId: patient._id })
      .sort({ checkInTime: -1 })
      .populate("room", "roomNumber unit roomType")
      .populate("attendingPhysicianId", "name");

    // ✅ Latest admission is just the first one
    const latestAdmission = admissions[0] || null;

    // ✅ Fetch vitals history (already works)
    const vitalsHistory = await Vital.find({ mrn: patient.mrn })
      .sort({ timestamp: -1 })
      .populate("recordedBy", "name");

    // Base patient object
    const patientDetails = patient.toObject();

    // Attach admission history as a list (like vitalsHistory)
    patientDetails.admissionHistory = admissions;

    // Convenience: flatten latest admission fields for quick access
    if (latestAdmission) {
      patientDetails.admissionReason = latestAdmission.admissionReason;
      patientDetails.admissionDate =
        latestAdmission.admissionDate || latestAdmission.checkInTime;
      patientDetails.assignedRoom = latestAdmission.room || null;
      patientDetails.attendingPhysician =
        latestAdmission.attendingPhysicianId || null;
      patientDetails.currentWorkflowStage =
        latestAdmission.currentWorkflowStage;
      patientDetails.documentation = latestAdmission.documentation || null;
      patientDetails.carePlan = latestAdmission.carePlan || null;
      patientDetails.admissionStatus = latestAdmission.status;
    } else {
      patientDetails.admissionReason = null;
      patientDetails.admissionDate = null;
      patientDetails.assignedRoom = null;
      patientDetails.attendingPhysician = null;
      patientDetails.currentWorkflowStage = "Not Admitted";
      patientDetails.documentation = null;
      patientDetails.carePlan = null;
      patientDetails.admissionStatus = "None";
    }

    // Attach vitals history list
    patientDetails.vitalsHistory = vitalsHistory;

    res.json(patientDetails);
  } catch (err) {
    console.error("Error fetching patient by MRN:", err);
    res
      .status(500)
      .json({ error: "Server error: Error fetching patient by MRN" });
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
