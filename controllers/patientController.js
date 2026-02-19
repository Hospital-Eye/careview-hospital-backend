const multer = require("multer");
const { Patient, Vital, Admission, User, Organization, Clinic, Counter, PatientRegistrationRequest } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');
const { logger } = require('../utils/logger');
const { generateMRN } = require("../utils/patientUtils");

//create patient with automatic room assignment based on availability and patient needs, and document upload to GCS

//Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Init GCS client
//const storage = new Storage();
//const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

//Create new patient
const createPatient = async (req, res) => {
  const endpoint = 'createPatient';
  const userEmail = req.user?.email || 'unknown';
  const startTime = Date.now();

  logger.info(`[Patient] Incoming request to create patient received from user: ${userEmail}`);

  try {
    const { emailId, clinicId: bodyClinicId, name, dob, gender } = req.body;

    // Ensure email exists
    if (!emailId) {
      logger.warn(`[Patient] Missing emailId in request to create patient`, { user: userEmail });
      return res.status(400).json({ error: "Email is required to create a patient." });
    }

    //Ensure registration request is APPROVED
    const approvedRequest = await PatientRegistrationRequest.findOne({
      where: {
        emailId: emailId.toLowerCase(),
        status: "approved"
      }
    });

    if (!approvedRequest) {
      logger.warn(`[Patient] No approved registration request found`, { emailId });
      return res.status(403).json({
        error: "Patient creation not allowed. Registration request not approved yet."
      });
    }

    const user = await User.findOne({ where: { email: emailId.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ error: "Associated user not found." });
    }

    const userId = user.id;

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;
    if (!userOrgId) {
      logger.warn(`[Patient] Missing organizationId in user context`, { user: userEmail });
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinic;
    let clinicId;

    if (role === "admin") {
      if (!bodyClinicId) {
        logger.warn(`[Patient] Admin missing clinicId in request to create patient`, { user: userEmail });
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }

      const query = isUUID(bodyClinicId)
        ? { id: bodyClinicId, organizationId: userOrgId }
        : { clinicId: bodyClinicId, organizationId: userOrgId };

      clinic = await Clinic.findOne({ where: query });
      if (!clinic) return res.status(404).json({ error: "Clinic not found" });

      clinicId = clinic.clinicId;
    } 
    else if (role === "manager" || role === "doctor") {
      if (!userClinicId) {
        return res.status(400).json({ error: `${role} has no assigned clinicId` });
      }

      const query = isUUID(userClinicId)
        ? { id: userClinicId, organizationId: userOrgId }
        : { clinicId: userClinicId, organizationId: userOrgId };

      clinic = await Clinic.findOne({ where: query });
      if (!clinic) return res.status(404).json({ error: "Assigned clinic not found" });

      clinicId = clinic.clinicId;
    } 
    else {
      logger.warn(`[${endpoint}] Unauthorized role attempted to create patient`, { role });
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const existingPatient = await Patient.findOne({ where: { userId } });
    if (existingPatient) {
      return res.status(200).json(existingPatient);
    }

    //generate MRN
    const mrn = await generateMRN(clinic.clinicId);

    //cretate patient record
    const patient = await Patient.create({
      ...req.body,
      userId,
      organizationId: userOrgId,
      clinicId,
      mrn,
    });

    //update user role to patient and link clinic/org
    await user.update({
      role: "patient",
      clinicId,
      organizationId: userOrgId,
      registered: true
    });

    await approvedRequest.update({
      fulfilledAt: new Date()
    });

    const duration = Date.now() - startTime;
    logger.info(`[${endpoint}] Patient created successfully`, {
      patientId: patient.id,
      mrn,
      clinicId,
      duration: `${duration}ms`,
      user: userEmail,
    });

    res.status(201).json(patient);

  } catch (err) {
    logger.error(`[${endpoint}] Error creating patient`, {
      error: err.message,
      stack: err.stack,
      user: userEmail,
    });
    res.status(400).json({ error: err.message });
  }
};

//Get all patients, optionally filtered by status
const getPatients = async (req, res) => {
  const endpoint = 'getPatients';
  const userEmail = req.user?.email || 'unknown';
  const startTime = Date.now();

  logger.info(`[${endpoint}] Incoming request to view all patients from user: ${userEmail}`);

  try {
    const { status } = req.query; 

    //Apply org/clinic scope
    const patientFilter = { ...req.scopeFilter };
    if (status) patientFilter.status = status;

    const admissionFilter = {};
    if (status) admissionFilter.status = status;

    logger.debug(`[${endpoint}] Applying filters`, {
      patientFilter,
      admissionFilter,
    });

    //Fetch patients with associations
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
              attributes: ['roomNumber', 'unit', 'roomType'],
            },
            {
              model: require('../models').Staff,
              as: 'attendingPhysician',
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    logger.debug(`[${endpoint}] Found ${patients.length} patient records`);

    //Flatten data
    const reshapedPatients = patients.map((p) => {
      const plainPatient = p.get({ plain: true });
      const latestAdmission =
        plainPatient.admissions?.length
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

    const duration = Date.now() - startTime;
    logger.info(`[${endpoint}] Successfully fetched ${reshapedPatients.length} patients in ${duration}ms`, {
      user: userEmail,
      filters: req.query,
    });

    res.json(reshapedPatients);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching patients`, {
      error: err.message,
      stack: err.stack,
      user: userEmail,
    });
    res.status(500).json({ error: err.message });
  }
};

//Get a patient by MRN (including admission history + vitals)
const getPatientByMRN = async (req, res) => {
  const endpoint = 'getPatientByMRN';
  const userEmail = req.user?.email || 'unknown';
  const mrn = String(req.params.mrn).trim();
  const startTime = Date.now();

  logger.info(`[${endpoint}] Request received from ${userEmail}`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
  });

  try {
    logger.debug(`[${endpoint}] Looking up patient with MRN: ${mrn}`);
    const patient = await Patient.findOne({ where: { mrn } });

    if (!patient) {
      logger.warn(`[${endpoint}] No patient found with MRN: ${mrn}`);
      return res.status(404).json({ error: 'Patient not found' });
    }

    logger.debug(`[${endpoint}] Fetching admission history for MRN: ${mrn}`);
    const admissions = await Admission.findAll({
      where: { patientId: patient.id },
      order: [['checkInTime', 'DESC']],
      include: [
        {
          model: require('../models').Room,
          as: 'roomDetails',
          attributes: ['roomNumber', 'unit', 'roomType'],
        },
        {
          model: require('../models').Staff,
          as: 'attendingPhysician',
          attributes: ['name'],
        },
      ],
    });

    const latestAdmission = admissions[0] || null;

    logger.debug(`[${endpoint}] Fetching vitals history for MRN: ${mrn}`);
    const vitalsHistory = await Vital.findAll({
      where: { mrn },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: require('../models').Staff,
          as: 'recorder',
          attributes: ['name'],
        },
      ],
    });

    //Prepare base patient data
    const patientDetails = patient.get({ plain: true });

    //Add admission history
    patientDetails.admissionHistory = admissions.map(a => a.get({ plain: true }));

    //Flatten latest admission details for convenience
    if (latestAdmission) {
      const plainAdmission = latestAdmission.get({ plain: true });
      Object.assign(patientDetails, {
        admissionReason: plainAdmission.admissionReason,
        admissionDate: plainAdmission.admissionDate || plainAdmission.checkInTime,
        assignedRoom: plainAdmission.roomDetails || null,
        attendingPhysician: plainAdmission.attendingPhysician || null,
        currentWorkflowStage: plainAdmission.currentWorkflowStage,
        documentation: plainAdmission.documentation || null,
        carePlan: plainAdmission.carePlan || null,
        admissionStatus: plainAdmission.status,
      });
    } else {
      Object.assign(patientDetails, {
        admissionReason: null,
        admissionDate: null,
        assignedRoom: null,
        attendingPhysician: null,
        currentWorkflowStage: 'Not Admitted',
        documentation: null,
        carePlan: null,
        admissionStatus: 'None',
      });
    }

    //Add vitals history
    patientDetails.vitalsHistory = vitalsHistory.map(v => v.get({ plain: true }));

    const duration = Date.now() - startTime;
    logger.info(`[${endpoint}] Successfully fetched patient MRN: ${mrn} in ${duration}ms by ${userEmail}`);

    res.json(patientDetails);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching patient MRN: ${req.params.mrn} — ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({ error: 'Server error: Error fetching patient by MRN' });
  }
};


//Update a patient by MRN (+ discharge patient)
const updatePatientByMRN = async (req, res) => {
  const endpoint = 'updatePatientByMRN';
  const userEmail = req.user?.email || 'unknown';
  const mrn = String(req.params.mrn).trim();

  logger.info(`[${endpoint}] Request received from ${userEmail}`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body
  });

  try {
    logger.debug(`[${endpoint}] Searching for patient with MRN: ${mrn}`);
    const patient = await Patient.findOne({ where: { mrn } });

    if (!patient) {
      logger.warn(`[${endpoint}] No patient found with MRN: ${mrn}`);
      return res.status(404).json({ message: 'Patient not found' });
    }

    const updateData = { ...req.body };

    //Handle discharge
    if (updateData.status && updateData.status.toLowerCase() === 'discharged') {
      updateData.status = 'Discharged';
      updateData.dischargeDate = new Date();
      logger.info(`[${endpoint}] Discharging patient MRN: ${mrn}`);

      const latestAdmission = await Admission.findOne({
        where: {
          patientId: patient.id,
          status: 'Active'
        },
        order: [['checkInTime', 'DESC']]
      });

      if (latestAdmission) {
        logger.debug(`[${endpoint}] Updating latest active admission for patient MRN: ${mrn}`);
        await latestAdmission.update({
          status: 'Completed',
          dischargeDate: new Date()
        });
      } else {
        logger.warn(`[${endpoint}] No active admission found for MRN: ${mrn}`);
      }

      logger.info(`Patient with MRN: ${mrn} discharged successfully by user: ${userEmail}`);
    }

    //Update patient data
    await patient.update(updateData);
    const updatedPatient = await Patient.findOne({ where: { mrn } });

    logger.info(`[${endpoint}] Patient MRN: ${mrn} updated successfully by ${userEmail}`);
    res.json(updatedPatient);

  } catch (err) {
    logger.error(`[${endpoint}] Error updating patient MRN: ${mrn} — ${err.message}`, {
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error: Unable to update patient' });
  }
};


//Delete a patient by MRN
const deletePatientByMRN = async (req, res) => {
  const endpoint = 'deletePatientByMRN';
  const userEmail = req.user?.email || 'unknown';
  const mrn = String(req.params.mrn);

  logger.info(`[${endpoint}] Request received from ${userEmail} to delete patient with MRN: ${mrn}`);

  try {
    const deleted = await Patient.destroy({ where: { mrn } });

    if (!deleted) {
      logger.warn(`[${endpoint}] No patient found with MRN: ${mrn}`);
      return res.status(404).json({ error: 'Patient not found' });
    }

    logger.info(`[${endpoint}] Patient with MRN: ${mrn} deleted successfully by ${userEmail}`);
    res.json({ message: 'Patient deleted successfully' });

  } catch (err) {
    logger.error(`[${endpoint}] Error deleting patient with MRN: ${mrn} — ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  createPatient,
  generateMRN,
  getPatients,
  getPatientByMRN,
  updatePatientByMRN,
  deletePatientByMRN
};
