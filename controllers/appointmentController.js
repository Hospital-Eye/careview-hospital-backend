const { Appointment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');


// Get all appointments
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
      query.start_time = {};
      if (req.query.from) query.start_time.$gte = new Date(req.query.from);
      if (req.query.to) query.start_time.$lte = new Date(req.query.to);
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
      order: [['start_time', 'ASC']]
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

module.exports = {
  getAppointments
};
