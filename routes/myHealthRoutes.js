const express = require('express');
const { Patient, Vital, Staff, User, Organization, Clinic } = require('../models');
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

    let organizationName = null;
    let clinicName = null;

    // Fetch organization name
    if (req.user.organizationId) {
      const organization = await Organization.findOne({
        where: { organizationId: req.user.organizationId }
      });
      organizationName = organization?.name || null;
    }

    // Fetch clinic name
    if (req.user.clinicId) {
      const clinic = await Clinic.findOne({
        where: { clinicId: req.user.clinicId }
      });
      clinicName = clinic?.name || null;
    }

    res.json({
      name: req.user.name || patient.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId || null,
      organizationName: organizationName,
      clinicId: req.user.clinicId || null,
      clinicName: clinicName,
      profilePicture: req.user.profilePicture || null,
      details: patientDetails,
    });
  } 
    catch (err) {
    logger.error(`[GetMyHealth] Error fetching patient health for user: ${req.user.email}`, err);
    console.error(err); // temporary
    return res.status(500).json({ error: "Failed to fetch health data" });
  }
});

//update patient info
router.put('/update', protect, authorize('patient'), async (req, res) => {
  const endpoint = 'UpdateMyProfile';
  const { allergies, precautions, emergencyContact } = req.body;

  try {
    logger.info(`[${endpoint}] Patient ${req.user.email} attempting to update profile`);

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      logger.warn(`[${endpoint}] No patient record found for ${req.user.email}`);
      return res.status(404).json({ message: 'Patient record not found' });
    }

    const updates = {};

    if (allergies !== undefined) {

  const incomingArray = Array.isArray(allergies) ? allergies : [allergies];

  const normalizedIncoming = incomingArray
    .map(item => {
      if (typeof item === "string") return item.trim().toLowerCase();
      if (item && typeof item === "object" && item.substance)
        return item.substance.trim().toLowerCase();
      return null;
    })
    .filter(Boolean);

  //Detect duplicates
  const hasDuplicateInsideIncoming =
    new Set(normalizedIncoming).size !== normalizedIncoming.length;

  if (hasDuplicateInsideIncoming) {
    return res.status(400).json({
      message: "Duplicate allergies in request"
    });
  }
  updates.allergies = normalizedIncoming;
}

    if (precautions !== undefined) {
      updates.precautions = precautions;
    }

    if (emergencyContact !== undefined) {
      const existingContact = patient.emergencyContact || {};
      updates.emergencyContact = {
        ...existingContact,
        ...emergencyContact
      };
    }
    
    await patient.update(updates);

    logger.info(`[${endpoint}] Patient ${req.user.email} profile updated successfully`);

    res.json({
      message: 'Profile updated successfully',
      updatedFields: updates
    });

  } catch (err) {
    logger.error(`[${endpoint}] Error updating patient profile: ${err.stack}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

