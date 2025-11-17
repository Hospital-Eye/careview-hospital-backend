const { Admission, Patient, Staff, Room } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');
const { logger } = require('../utils/logger');

//Create a new admission
const createAdmission = async (req, res) => {
  const endpoint = 'createAdmission';
  const userEmail = req.user?.email || 'unknown';
  const patientId = req.body?.patientId || 'unknown';
  const clinicId = req.user?.clinicId || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create admission for patientId=${patientId} in clinicId=${clinicId} from user=${userEmail}`);

  const t = await sequelize.transaction();

  try {
    const {
      patientId,
      admittedByStaffId,      
      attendingPhysicianName, 
      admissionReason,
      acuityLevel,
      unit,
      roomType
    } = req.body;

    //Validate Patient
    const patient = await Patient.findByPk(patientId, { transaction: t });

    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for ID: ${patientId}`);
      await t.rollback();
      return res.status(404).json({ error: "Patient not found" });
    }

    //Validate Admitting Staff
    let admittedStaffIdResolved = null;

    if (admittedByStaffId) {
      logger.info(`[${endpoint}] Looking up admitting staff with ID: ${admittedByStaffId}`);

      const staff = await Staff.findByPk(admittedByStaffId, { transaction: t });

      logger.debug(`[${endpoint}] Staff lookup result: ${JSON.stringify(staff)}`);

      if (!staff) {
        logger.warn(
          `[${endpoint}] Admitting staff not found for ID: ${admittedByStaffId}`
        );
        await t.rollback();
        return res.status(400).json({ error: "Admitting staff not found" });
      }

      admittedStaffIdResolved = staff.id;
      logger.info(`[${endpoint}] Admission created by Admitting staff: ${staff.name} (ID: ${staff.id})`);
    }

    //Validate Attending Physician
    let attendingPhysicianIdResolved = null;

    if (attendingPhysicianName) {
      const physician = await Staff.findOne({
        where: {
          name: attendingPhysicianName,
          organizationId: req.user.organizationId,
          clinicId: req.user.clinicId,
          role: "doctor"
        },
        transaction: t
      });

      logger.debug(`[${endpoint}] Physician lookup result: ${JSON.stringify(physician)}`);

      if (!physician) {
        logger.warn(
          `[${endpoint}] Attending physician not found: ${attendingPhysicianName}`
        );
        await t.rollback();
        return res.status(400).json({ error: "Attending physician not found" });
      }

      attendingPhysicianIdResolved = physician.id;

      logger.info(
        `[${endpoint}] Physician attending to the admission: ${physician.name} (ID: ${physician.id})`
      );
    }

    //Validate Room Allocation
    const allocatedRoom = await Room.findOne({
      where: {
        id: req.body.room,
        organizationId: patient.organizationId,
        clinicId: patient.clinicId
      },
      transaction: t
    });

    if (!allocatedRoom) {
      logger.warn(
        `[${endpoint}] Room not found or unavailable: ${req.body.room}`
      );
      await t.rollback();
      return res.status(400).json({ error: "Specified room not found or unavailable" });
    }

    logger.info(`[${endpoint}] Patient admitted in Room: Room ${allocatedRoom.roomNumber} (ID: ${allocatedRoom.id})`);

    //create admission
    const admission = await Admission.create(
      {
        patientId: patient.id,
        organizationId: patient.organizationId,
        clinicId: patient.clinicId,
        room: allocatedRoom.id,
        admittedByStaffId: admittedStaffIdResolved,
        attendingPhysicianId: attendingPhysicianIdResolved,
        admissionReason,
        acuityLevel,
        status: "Active"
      },
      { transaction: t }
    );

    logger.info(`[${endpoint}] Admission created successfully for patient ${patient.name} (ID: ${patientId})`);

    await patient.update(
      {
        currentAdmissionId: admission.id,
        room: allocatedRoom.id,
        status: "Active"
      },
      { transaction: t }
    );

    // Commit transaction
    await t.commit();

    logger.info(`[${endpoint}] Admission workflow completed successfully for patient ${patient.name} (Admission ID: ${admission.id})`);

    res.status(201).json({
      admission,
      assignedRoom: {
        roomId: allocatedRoom.id,
        roomNumber: allocatedRoom.roomNumber,
        unit: allocatedRoom.unit,
        roomType: allocatedRoom.roomType,
        capacity: allocatedRoom.capacity
      }
    });

  } catch (err) {
    await t.rollback();
    logger.error(`[${endpoint}] Error creating admission for patient ${patient.name} : ${err.message}`, {
      stack: err.stack
    });
    res.status(400).json({ error: err.message });
  }
};


//Get all admissions for the user's clinic and organization
const getAdmissions = async (req, res) => {
  const endpoint = 'getAdmissions';
  const userEmail = req.user?.email || 'unknown';
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to fetch all admissions for clinicId=${clinicId} from user=${userEmail}`);

  try {
    const { clinicId, organizationId } = req.user;
    const filter = req.scopeFilter || {};

    const admissions = await Admission.findAll({
      where: filter,
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["name", "mrn"]
        },
        {
          model: Room,
          as: "roomDetails"
        }
      ]
    });

    const result = admissions.map((adm) => ({
      id: adm.id,
      patientName: adm.patient?.name || "—",
      mrn: adm.patient?.mrn || "—",
      roomNumber: adm.roomDetails?.roomNumber || "—",
      acuityLevel: adm.acuityLevel,
      status: adm.status,
      admissionDate: adm.admissionDate
    }));

    res.json(result);
  } catch (err) {
    logger.error(`[${endpoint}] Error in getAdmissions: ${err.message}`, {
      stack: err.stack
    });
    res.status(500).json({ error: "Server error" });
  }
};

//Get admission by ID
const getAdmissionById = async (req, res) => {
  const endpoint = 'getAdmissionById';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to fetch admissionId=${admissionId} for clinicId=${clinicId} from user=${userEmail}`);

  try {
    const admission = await Admission.findByPk(admissionId, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Room, as: 'roomDetails' },
        { model: Staff, as: 'admittedByStaff' },
        { model: Staff, as: 'attendingPhysician' }
      ]
    });

    if (!admission) {
      logger.warn(`[${endpoint}] Admission not found for ID: ${admissionId}`);
      return res.status(404).json({ error: 'Admission not found' });
    }

    logger.info(
      `[${endpoint}] Fetching admission record for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    res.json(admission);

  } catch (err) {
    logger.error(
      `[${endpoint}] Error in getAdmissionById: ${err.message}`,
      { stack: err.stack }
    );
    res.status(400).json({ error: err.message });
  }
};


//Get active admission for a patient
const getActiveAdmissionByPatient = async (req, res) => {
  const endpoint = 'getActiveAdmissionByPatient';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to fetch active admission for patientId=${req.params.patientId} for clinicId=${clinicId} from user=${userEmail}`);
  try {
    const admission = await Admission.findOne({
      where: {
        patientId: req.params.patientId,
        status: 'Active'
      },
      include: [
        { model: Room, as: 'roomDetails' },
        { model: Staff, as: 'admittedByStaff' },
        { model: Staff, as: 'attendingPhysician' }
      ]
    });
    if (!admission) return res.status(404).json({ error: 'No active admission found' });

    logger.info(
      `[${endpoint}] Fetching admission record for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    res.json(admission);
  } catch (err) {logger.error(
      `[${endpoint}] Error in getAdmissionById: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: 'Server error: No active admission by patient found' });
  }
};

//Get admission by ID
const getAdmissionsByDateRange = async (req, res) => {
  const endpoint = 'getAdmissionById';
  const userEmail = req.user?.email || 'unknown';     
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to fetch admissions by date range for clinicId=${clinicId} from user=${userEmail}`);
  try {
    logger.debug(`[Admission] Request params: ${JSON.stringify(req.params)}`);

    const admission = await Admission.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Room, as: 'roomDetails' },
        { model: Staff, as: 'admittedByStaff' },
        { model: Staff, as: 'attendingPhysician' }
      ]
    });

    if (!admission) {
      logger.warn(`[${endpoint}] Admission not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Admission not found' });
    }

    logger.info(
      `[${endpoint}] Retrieved admission for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${req.params.id})`);

    res.json(admission);

  } catch (err) {
    logger.error(`[${endpoint}] Error in getAdmissionById: ${err.message}`,{ stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};


//Update an admission
const updateAdmission = async (req, res) => {
  const endpoint = 'updateAdmission';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to update admissionId=${admissionId} for clinicId=${clinicId} from user=${userEmail}`);

  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    logger.info(
      `[${endpoint}] Updating admission record of patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    const updated = await admission.update(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//Update workflow stage
const updateWorkflowStage = async (req, res) => {
  const endpoint = 'updateWorkflowStage';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to update workflow stage for admissionId=${admissionId} for clinicId=${clinicId} from user=${userEmail}`);  
  
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    logger.info(
      `[${endpoint}] Updating workflow stage in admission record for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    const updated = await admission.update({ currentWorkflowStage: req.body.stage });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//Transfer patient to another room
const transferRoom = async (req, res) => {
  const endpoint = 'transferRoom';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const patientId = req.body?.patientId || 'unknown';
  const clinicId = req.user?.clinicId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to transfer patient for admissionId=${admissionId} for clinicId=${clinicId} from user=${userEmail}`);

  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

    logger.info(
      `[${endpoint}] Transferring patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    await admission.update({ assignedRoomId: req.body.newRoomId }, { transaction: t });

    const patient = await Patient.findByPk(admission.patientId, { transaction: t });
    await patient.update({ room: req.body.newRoomId }, { transaction: t });

    await t.commit();

    res.json({ message: 'Patient transferred successfully', admission });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Server error: Unable to transfer patient' });
  }
};

//Cancel an admission
const cancelAdmission = async (req, res) => {
  const endpoint = 'cancelAdmission';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  const patientId = req.body?.patientId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to cancel admissionId=${admissionId} of patientId=${patientId} for clinicId=${clinicId} from user=${userEmail}`);

  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

    logger.info(
      `[${endpoint}] Canceling admission for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    await admission.update({
      status: 'Canceled',
      currentWorkflowStage: 'Canceled'
    }, { transaction: t });

    const patient = await Patient.findByPk(admission.patientId, { transaction: t });
    await patient.update({ currentAdmissionId: null }, { transaction: t });

    await t.commit();

    res.json({ message: 'Admission canceled successfully', admission });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Server error: Unable to cancel admission' });
  }
};

//Delete an admission
const deleteAdmission = async (req, res) => {
  const endpoint = 'deleteAdmission';
  const userEmail = req.user?.email || 'unknown';     
  const admissionId = req.params.id;
  const clinicId = req.user?.clinicId || 'unknown';
  const patientId = req.body?.patientId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to delete admissionId=${admissionId} of patientId=${patientId} for clinicId=${clinicId} from user=${userEmail}`);

  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

    logger.info(
      `[${endpoint}] Deleting admission record for patient: ${admission.patient?.name || 'Unknown'} (Admission ID: ${admissionId})`);

    const patientId = admission.patientId;

    await Admission.destroy({
      where: { id: req.params.id },
      transaction: t
    });

    const patient = await Patient.findByPk(patientId, { transaction: t });
    if (patient) {
      await patient.update({ currentAdmissionId: null }, { transaction: t });
    }

    await t.commit();

    res.json({ message: 'Admission deleted successfully' });
  } catch (err) {
    await t.rollback();
    logger.error(`[${endpoint}] Error deleting admission ID=${admissionId}: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Server error: Unable to delete admission' });
  }
};


module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  getActiveAdmissionByPatient,
  getAdmissionsByDateRange,
  updateAdmission,
  updateWorkflowStage,
  transferRoom,
  cancelAdmission,
  deleteAdmission
};
