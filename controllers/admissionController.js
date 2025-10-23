const { Admission, Patient, Staff, Room } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { validate: isUUID } = require('uuid');

// Create a new admission
const createAdmission = async (req, res) => {
  console.log("🩺 createAdmission endpoint hit");

  console.log(req.body);

  const t = await sequelize.transaction();

  try {
    const {
      patientId,
      admittedByStaffId,      // employeeId of admitting staff
      attendingPhysicianName, // physician name
      admissionReason,
      acuityLevel,
      unit,
      roomType
    } = req.body;

    // ------------------- Resolve patient -------------------
    const patient = await Patient.findByPk(patientId, { transaction: t });

    if (!patient) {
      console.warn(`❌ Patient not found for ID: ${patientId}`);
      await t.rollback();
      return res.status(404).json({ error: "Patient not found" });
    }


    // ------------------- Resolve admitting staff -------------------
    let admittedStaffIdResolved = null;

    if (admittedByStaffId) {
      console.log("🔍 Looking for admitting staff with ID:", admittedByStaffId);
      const staff = await Staff.findByPk(admittedByStaffId, { transaction: t });
      console.log("🧠 Found staff:", staff);

      if (!staff) {
        console.warn(`❌ No staff found for ID ${admittedByStaffId}`);
        await t.rollback();
        return res.status(400).json({ error: "Admitting staff not found" });
      }

      admittedStaffIdResolved = staff.id;
      console.log("✅ Staff resolved successfully:", admittedStaffIdResolved);
    }

    // ------------------- Resolve attending physician -------------------
    let attendingPhysicianIdResolved = null;
    if (attendingPhysicianName) {
      console.log("🔍 Looking for attending physician:", attendingPhysicianName);
      const physician = await Staff.findOne({
        where: {
          name: attendingPhysicianName,
          organizationId: req.user.organizationId,
          clinicId: req.user.clinicId,
          role: "doctor"
        },
        transaction: t
      });
      console.log("🧠 Found physician:", physician);
      if (!physician) {
        console.warn("❌ Attending physician not found");
        await t.rollback();
        return res.status(400).json({ error: "Attending physician not found" });
      }
      attendingPhysicianIdResolved = physician.id;
    }

    // ------------------- Resolve allocated Room -------------------
    const allocatedRoom = await Room.findOne({
      where: {
        id: req.body.room,
        organizationId: patient.organizationId,
        clinicId: patient.clinicId
      },
      transaction: t
    });

    if (!allocatedRoom) {
      await t.rollback();
      return res.status(400).json({ error: "Specified room not found or unavailable" });
    }

    // ------------------- Create admission -------------------
    const admission = await Admission.create({
      patientId: patient.id,
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      room: allocatedRoom.id,
      admittedByStaffId: admittedStaffIdResolved,
      attendingPhysicianId: attendingPhysicianIdResolved,
      admissionReason,
      acuityLevel,
      status: "Active"
    }, { transaction: t });

    // ------------------- Update patient record -------------------
    await patient.update({
      currentAdmissionId: admission.id,
      room: allocatedRoom.id,
      status: "Active"
    }, { transaction: t });

    await t.commit();

    console.log("🎉 Admission successfully created:", admission.id);

    // ------------------- Respond with admission + room info -------------------
    res.status(201).json({
      admission: admission,
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
    console.error("Error creating admission:", err);
    res.status(400).json({ error: err.message });
  }
};

// get all admissions for the user's clinic & org
const getAdmissions = async (req, res) => {
  try {
    // assuming you attach clinicId & organizationId to req.user in your auth middleware
    const { clinicId, organizationId } = req.user;

    const filter = req.scopeFilter || {};

    const admissions = await Admission.findAll({
      where: filter,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['name', 'mrn']
        },
        {
          model: Room,
          as: 'roomDetails'
        }
      ]
    });

    const result = admissions.map(adm => ({
      id: adm.id,
      patientName: adm.patient?.name || '—',
      mrn: adm.patient?.mrn || '—',
      roomNumber: adm.roomDetails?.roomNumber || '—',
      acuityLevel: adm.acuityLevel,
      status: adm.status,
      admissionDate: adm.admissionDate
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// get admission by ID
const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Room, as: 'roomDetails' },
        { model: Staff, as: 'admittedByStaff' },
        { model: Staff, as: 'attendingPhysician' }
      ]
    });
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get active admission for a patient
const getActiveAdmissionByPatient = async (req, res) => {
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
    res.json(admission);
  } catch (err) {
    res.status(500).json({ error: 'Server error: No active admission by patient found' });
  }
};

// Get admissions by date range
const getAdmissionsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const admissions = await Admission.findAll({
      where: {
        admissionDate: {
          [Op.gte]: new Date(start),
          [Op.lte]: new Date(end)
        }
      },
      include: [
        { model: Patient, as: 'patient' },
        { model: Room, as: 'roomDetails' },
        { model: Staff, as: 'attendingPhysician' }
      ]
    });
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ error: 'Server error: No admissions by date range found' });
  }
};

// update an admission
const updateAdmission = async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    const updated = await admission.update(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update workflow stage
const updateWorkflowStage = async (req, res) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    const updated = await admission.update({ currentWorkflowStage: req.body.stage });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Transfer patient to another room
const transferRoom = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

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

//cancel an admission
const cancelAdmission = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

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

//delete an admission
const deleteAdmission = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const admission = await Admission.findByPk(req.params.id, { transaction: t });
    if (!admission) {
      await t.rollback();
      return res.status(404).json({ error: 'Admission not found' });
    }

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
