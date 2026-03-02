const { Appointment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');


//Get all appointments
const getAppointments = async (req, res) => {
  const endpoint = 'getAppointments';
  const userEmail = req.user?.email || 'unknown';

  logger.info(
    `[${endpoint}] Request to view appointments received from user: ${userEmail}`
  );

  try {
    // org + clinic scope injected by middleware
    const scopeFilter = req.scopeFilter || {};
    const query = { ...scopeFilter };

    // Optional filters
    if (req.query.status) query.status = req.query.status;

    if (req.query.from || req.query.to) {
      query.startTime = {};
      if (req.query.from) query.startTime.$gte = new Date(req.query.from);
      if (req.query.to) query.startTime.$lte = new Date(req.query.to);
    }

    const appointments = await Appointment.findAll({
      where: query,
      include: [
        {
          model: require('../models').Patient,
          as: 'patient',
          attributes: ['id', 'name', 'mrn']
        }
      ],
      order: [['startTime', 'ASC']]
    });

    logger.info(
      `[${endpoint}] Retrieved ${appointments.length} appointments for user=${userEmail}`
    );

    res.json(appointments);
  } catch (err) {
    logger.error(
      `[${endpoint}] Error fetching appointments: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: err.message });
  }
};


//Get appointment by ID
const getAppointmentById = async (req, res) => {
  const endpoint = 'getAppointmentById';
  const userEmail = req.user?.email || 'unknown';
  const appointmentId = req.params.id;

  logger.info(
    `[${endpoint}] Request to view appointment id=${appointmentId} received from user: ${userEmail}`
  );

  try {
    // org + clinic scope injected by middleware
    const scopeFilter = req.scopeFilter || {};

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        ...scopeFilter
      },
      include: [
        {
          model: require('../models').Patient,
          as: 'patient',
          attributes: ['id', 'name', 'mrn']
        }
      ]
    });

    if (!appointment) {
      logger.warn(
        `[${endpoint}] Appointment not found or access denied for id=${appointmentId}, user=${userEmail}`
      );
      return res.status(404).json({ error: 'Appointment not found' });
    }

    logger.info(
      `[${endpoint}] Retrieved appointment id=${appointmentId} for user=${userEmail}`
    );

    res.json(appointment);
  } catch (err) {
    logger.error(
      `[${endpoint}] Error fetching appointment id=${appointmentId}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: err.message });
  }
};

// Get appointments by patient ID
const getAppointmentsByPatientId = async (req, res) => {
  const endpoint = 'getAppointmentsByPatientId';
  const userEmail = req.user?.email || 'unknown';
  const patientId = req.params.patientId;

  console.log("payload patientId", patientId);

  logger.info(
    `[${endpoint}] Request to view appointments for patientId=${patientId} from user=${userEmail}`
  );

  try {
    // org + clinic scope injected by middleware
    const scopeFilter = req.scopeFilter || {};

    const query = {
      ...scopeFilter,
      patient_id: patientId
    };

    console.log("constructed query", query);

    // Optional filters
    if (req.query.status) query.status = req.query.status;

    if (req.query.from || req.query.to) {
      query.startTime = {};
      if (req.query.from) query.startTime.$gte = new Date(req.query.from);
      if (req.query.to) query.startTime.$lte = new Date(req.query.to);
    }

    const appointments = await Appointment.findAll({
      where: query,
      include: [
        {
          model: require('../models').Patient,
          as: 'patient',
          attributes: ['id', 'name', 'mrn']
        }
      ],
      order: [['startTime', 'ASC']]
    });

    logger.info(
      `[${endpoint}] Retrieved ${appointments.length} appointments for patientId=${patientId}, user=${userEmail}`
    );

    res.json(appointments);
  } catch (err) {
    logger.error(
      `[${endpoint}] Error fetching appointments for patientId=${patientId}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: err.message });
  }
};

// Reschedule appointment by ID
const rescheduleAppointmentById = async (req, res) => {
  const endpoint = 'rescheduleAppointmentById';
  const userEmail = req.user?.email || 'unknown';
  const appointmentId = req.params.id;
  const { newStartTime, newEndTime } = req.body;

  logger.info(
    `[${endpoint}] Request to reschedule appointment id=${appointmentId} from user=${userEmail}`
  );

  try {
    if (!newStartTime) {
      return res.status(400).json({ error: 'newStartTime is required' });
    }

    const scopeFilter = req.scopeFilter || {};

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        ...scopeFilter
      }
    });

    if (!appointment) {
      logger.warn(
        `[${endpoint}] Appointment not found or access denied for id=${appointmentId}, user=${userEmail}`
      );
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot reschedule a cancelled appointment'
      });
    }

    appointment.startTime = new Date(newStartTime);

    if (newEndTime) {
      appointment.endTime = new Date(newEndTime);
    }

    appointment.status = 'rescheduled';

    await appointment.save();

    logger.info(
      `[${endpoint}] Successfully rescheduled appointment id=${appointmentId} by user=${userEmail}`
    );

    res.json(appointment);
  } catch (err) {
    logger.error(
      `[${endpoint}] Error rescheduling appointment id=${appointmentId}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: err.message });
  }
};

// Cancel appointment by ID
const cancelAppointmentById = async (req, res) => {
  const endpoint = 'cancelAppointmentById';
  const userEmail = req.user?.email || 'unknown';
  const appointmentId = req.params.id;

  logger.info(
    `[${endpoint}] Request to cancel appointment id=${appointmentId} from user=${userEmail}`
  );

  try {
    const scopeFilter = req.scopeFilter || {};

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        ...scopeFilter
      }
    });

    if (!appointment) {
      logger.warn(
        `[${endpoint}] Appointment not found or access denied for id=${appointmentId}, user=${userEmail}`
      );
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Appointment is already cancelled'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();

    await appointment.save();

    logger.info(
      `[${endpoint}] Successfully cancelled appointment id=${appointmentId} by user=${userEmail}`
    );

    res.json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (err) {
    logger.error(
      `[${endpoint}] Error cancelling appointment id=${appointmentId}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  getAppointmentsByPatientId,
  rescheduleAppointmentById,
  cancelAppointmentById
};
