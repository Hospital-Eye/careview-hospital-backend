const express = require('express');
const { Patient, Vital, Staff, User } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

const router = express.Router();

router.get('/', protect, authorize('patient'), async (req, res) => {
  const endpoint = 'GetMyHealth';
  try {
    logger.info(`[${endpoint}] Fetching health data for user: ${req.user.email}`);

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      logger.warn(`[${endpoint}] Patient data not found for user: ${req.user.email}`);
      return res.status(404).json({ message: 'Patient data not found' });
    }

    const vitalsHistory = await Vital.findAll({
      where: { mrn: patient.mrn },
      order: [['timestamp', 'DESC']],
      include: [
        { model: Staff, as: 'recorder', attributes: ['name'] }
      ]
    });

    const patientDetails = {
      ...patient.toJSON(),
      vitalsHistory
    };

    res.json({
      name: req.user.name || patient.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId || null,
      clinicId: req.user.clinicId || null,
      profilePicture: req.user.profilePicture || null,
      details: patientDetails,
    });

  } catch (err) {
    logger.error(`[${endpoint}] Error fetching patient health for user: ${req.user.email}: ${err.stack}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;

