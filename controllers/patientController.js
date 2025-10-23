const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const { Patient, Vital, Admission, User, Organization, Clinic, Counter } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');

//create patient with automatic room assignment based on availability and patient needs, and document upload to GCS

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Init GCS client
const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// --- create new patient ---
const createPatient = async (req, res) => {
  try {
    const { emailId, clinicId: bodyClinicId, name, dob, gender } = req.body;
    let userId;

    // Ensure email exists
    if (!emailId) {
      return res.status(400).json({ error: "Email is required to create a patient." });
    }

    // Find or create User
    let user = await User.findOne({ where: { email: emailId } });
    if (user) {
      userId = user.id;
      req.body.emailId = user.email;
    } else {
      user = await User.create({
        name: name || "Unknown",
        email: emailId,
        role: "patient",
        organizationId: req.user.organizationId,
        clinicId: req.user.clinicId,
      });
      userId = user.id;
    }

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;
    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    // ----------------- Resolve Clinic -----------------
    let clinic;
    let clinicId;

    // 🧩 Admin can specify clinicId manually
    if (role === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }

      let query;
      if (isUUID(bodyClinicId)) {
        query = { id: bodyClinicId, organizationId: userOrgId };
      } else {
        query = { clinicId: bodyClinicId, organizationId: userOrgId };
      }

      clinic = await Clinic.findOne({ where: query });

      if (!clinic) {
        return res.status(404).json({ error: "Clinic not found" });
      }

      clinicId = clinic.clinicId;
    }

    // 🧩 Manager's clinic is fixed (comes from req.user.clinicId)
    else if (role === "manager") {
      if (!userClinicId) {
        return res.status(400).json({ error: "Manager has no assigned clinicId" });
      }

      let query;
      if (isUUID(userClinicId)) {
        query = { id: userClinicId };
      } else {
        query = { clinicId: userClinicId };
      }

      clinic = await Clinic.findOne({ where: query });
      if (!clinic) {
        return res.status(404).json({ error: "Assigned clinic not found" });
      }

      clinicId = clinic.clinicId;
    }

    // ❌ No access for other roles
    else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    // Prevent duplicate patient linked to the same user
    const existingPatient = await Patient.findOne({ where: { userId } });
    if (existingPatient) return res.status(200).json(existingPatient);

    // ----------------- MRN Generation -----------------
    function clinicPrefix(clinicId) {
      const parts = clinicId.split("-");
      const name = parts[0].substring(0, 3).toUpperCase();
      const number = parts[1] || "1";
      return `${name}${number}`;
    }

    const prefix = clinicPrefix(clinic.clinicId);

    const lastPatient = await Patient.findOne({
      where: { clinicId: clinic.clinicId },
      order: [['mrn', 'DESC']],
      limit: 1
    });

    let lastSeq = 1000;
    if (lastPatient && lastPatient.mrn) {
      const parts = lastPatient.mrn.split("-");
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) lastSeq = num;
    }

    const nextNumber = lastSeq + 1;
    const mrn = `${prefix}-${nextNumber}`;

    // ----------------- Create Patient -----------------
    const patient = await Patient.create({
      ...req.body,
      userId,
      organizationId: userOrgId,
      clinicId,
      mrn,
    });

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

    // Apply scope (org/clinic)
    const patientFilter = { ...req.scopeFilter };
    if (status) patientFilter.status = status; // ✅ Filter by patient.status

    // Optional: admission filter if you want to limit nested admissions too
    const admissionFilter = {};
    if (status) {
      admissionFilter.status = status;
    }

    // Fetch patients with associations
    const patients = await Patient.findAll({
      where: patientFilter,
      include: [
        {
          model: Admission,
          as: 'admissions',
          where: Object.keys(admissionFilter).length > 0 ? admissionFilter : undefined,
          required: false,
          include: [
            {
              model: require('../models').Room,
              as: 'roomDetails',
              attributes: ['roomNumber', 'unit', 'roomType']
            },
            {
              model: require('../models').Staff,
              as: 'attendingPhysician',
              attributes: ['name']
            }
          ]
        }
      ]
    });

    // Flatten structure
    const reshapedPatients = patients.map(p => {
      const plainPatient = p.get({ plain: true });
      const latestAdmission = plainPatient.admissions?.length
        ? plainPatient.admissions[plainPatient.admissions.length - 1]
        : null;

      return {
        ...plainPatient,
        roomId: latestAdmission?.roomDetails?.id || null,
        roomNumber: latestAdmission?.roomDetails?.roomNumber || null,
        roomUnit: latestAdmission?.roomDetails?.unit || null,
        roomType: latestAdmission?.roomDetails?.roomType || null,
        attendingPhysicianName: latestAdmission?.attendingPhysician?.name || null,
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
    const patient = await Patient.findOne({ where: { mrn: req.params.mrn } });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // ✅ Fetch ALL admissions for this patient, newest first
    const admissions = await Admission.findAll({
      where: { patientId: patient.id },
      order: [['checkInTime', 'DESC']],
      include: [
        {
          model: require('../models').Room,
          as: 'roomDetails',
          attributes: ['roomNumber', 'unit', 'roomType']
        },
        {
          model: require('../models').Staff,
          as: 'attendingPhysician',
          attributes: ['name']
        }
      ]
    });

    // ✅ Latest admission is just the first one
    const latestAdmission = admissions[0] || null;

    // ✅ Fetch vitals history
    const vitalsHistory = await Vital.findAll({
      where: { mrn: patient.mrn },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: require('../models').Staff,
          as: 'recorder',
          attributes: ['name']
        }
      ]
    });

    // Base patient object
    const patientDetails = patient.get({ plain: true });

    // Attach admission history as a list (like vitalsHistory)
    patientDetails.admissionHistory = admissions.map(a => a.get({ plain: true }));

    // Convenience: flatten latest admission fields for quick access
    if (latestAdmission) {
      const plainAdmission = latestAdmission.get({ plain: true });
      patientDetails.admissionReason = plainAdmission.admissionReason;
      patientDetails.admissionDate = plainAdmission.admissionDate || plainAdmission.checkInTime;
      patientDetails.assignedRoom = plainAdmission.roomDetails || null;
      patientDetails.attendingPhysician = plainAdmission.attendingPhysician || null;
      patientDetails.currentWorkflowStage = plainAdmission.currentWorkflowStage;
      patientDetails.documentation = plainAdmission.documentation || null;
      patientDetails.carePlan = plainAdmission.carePlan || null;
      patientDetails.admissionStatus = plainAdmission.status;
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
    patientDetails.vitalsHistory = vitalsHistory.map(v => v.get({ plain: true }));

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

    console.log("MRN param:", req.params.mrn);
    console.log("Full URL:", req.originalUrl);
    console.log("HTTP Method:", req.method);
    console.log("Params:", req.params);
    console.log("Query:", req.query);
    console.log("Body:", req.body);
    console.log("Looking for patient with MRN:", mrn.trim());

    // Find the patient first
    const patient = await Patient.findOne({ where: { mrn: mrn.trim() } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // If status is being changed to Discharged
    if (updateData.status && updateData.status.toLowerCase() === "discharged") {
      updateData.status = "Discharged";
      updateData.dischargeDate = new Date();

      // Update latest active admission for this patient
      const latestAdmission = await Admission.findOne({
        where: {
          patientId: patient.id,
          status: 'Active'
        },
        order: [['checkInTime', 'DESC']]
      });

      if (latestAdmission) {
        await latestAdmission.update({
          status: 'Completed',
          dischargeDate: new Date()
        });
      }
    }

    // Update patient data
    await patient.update(updateData);
    const updatedPatient = await Patient.findOne({ where: { mrn } });

    res.json(updatedPatient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: Unable to update patient" });
  }
};


// Delete a patient by MRN
const deletePatientByMRN = async (req, res) => {
  try {
    const deleted = await Patient.destroy({ where: { mrn: String(req.params.mrn) } });
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
