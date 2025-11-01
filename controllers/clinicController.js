const { Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

// --- Create a new Clinic ---
const createClinic = async (req, res) => {
  try {
    logger.info(`🏥 [createClinic] Incoming request from user=${req.user?.email || 'unknown'}`);
    logger.debug(`📩 [createClinic] Request body: ${JSON.stringify(req.body)}`);

    const { name, registrationNumber, type, address, contactEmail, contactPhone, location } = req.body;
    const { organizationId } = req.user;  // take org from logged-in user

    if (!organizationId) {
      logger.warn(`⚠️ [createClinic] Missing organizationId in user context for user=${req.user?.email || 'unknown'}`);
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    if (!name) {
      logger.warn(`⚠️ [createClinic] Clinic name missing in request`);
      return res.status(400).json({ error: "Clinic name is required" });
    }

    // Generate a base prefix from the clinic name
    const base = name.replace(/\s+/g, "").toLowerCase();
    logger.debug(`🔤 [createClinic] Generated base prefix: ${base}`);

    // Find existing clinics with same base prefix
    const existingClinics = await Clinic.findAll({
      where: {
        clinicId: {
          [Op.like]: `${base}-%`
        }
      }
    });

    const nextNumber = existingClinics.length + 1;
    const clinicId = `${base}-${nextNumber}`;
    logger.info(`🏷️ [createClinic] Generated new clinicId=${clinicId} for organizationId=${organizationId}`);

    // Create the new clinic
    const clinic = await Clinic.create({
      clinicId,
      organizationId,
      name,
      registrationNumber,
      type,
      address,
      contactEmail,
      contactPhone
    });

    logger.info(`✅ [createClinic] Clinic created successfully: id=${clinic.id}, clinicId=${clinic.clinicId}, orgId=${organizationId}`);
    res.status(201).json(clinic);

  } catch (err) {
    logger.error(`❌ [createClinic] Error creating clinic: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// --- Get all clinics (with scope) ---
const getClinics = async (req, res) => {
  try {
    logger.info(`📥 [getClinics] Incoming request from user=${req.user?.email || 'unknown'}`);
    const filter = req.scopeFilter || {};
    logger.debug(`🔍 [getClinics] Using scope filter: ${JSON.stringify(filter)}`);

    const clinics = await Clinic.findAll({ where: filter });
    logger.info(`✅ [getClinics] Found ${clinics.length} clinics`);
    res.status(200).json(clinics);
  } catch (error) {
    logger.error(`❌ [getClinics] Error fetching clinics: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: "Server error" });
  }
};

// --- Get clinic by clinicId ---
const getClinicById = async (req, res) => {
  try {
    logger.info(`📥 [getClinicById] Request received for clinicId=${req.params.id}`);
    const clinic = await Clinic.findOne({ where: { clinicId: req.params.id } });

    if (!clinic) {
      logger.warn(`⚠️ [getClinicById] No clinic found for clinicId=${req.params.id}`);
      return res.status(404).send();
    }

    logger.info(`✅ [getClinicById] Clinic found: id=${clinic.id}, name=${clinic.name}`);
    res.status(200).send(clinic);
  } catch (error) {
    logger.error(`❌ [getClinicById] Error fetching clinic: ${error.message}`, { stack: error.stack });
    res.status(500).send(error);
  }
};

// --- Edit a clinic ---
const editClinic = async (req, res) => {
  try {
    logger.info(`✏️ [editClinic] Update request for clinicId=${req.params.id} by user=${req.user?.email || 'unknown'}`);
    logger.debug(`📦 [editClinic] Update payload: ${JSON.stringify(req.body)}`);

    const { id } = req.params;
    const clinic = await Clinic.findByPk(id);

    if (!clinic) {
      logger.warn(`⚠️ [editClinic] Clinic not found for id=${id}`);
      return res.status(404).json({ message: "Clinic not found" });
    }

    await clinic.update(req.body);
    logger.info(`✅ [editClinic] Clinic updated successfully: id=${id}`);
    res.status(200).json(clinic);
  } catch (error) {
    logger.error(`❌ [editClinic] Error updating clinic: ${error.message}`, { stack: error.stack });
    res.status(400).json({ error: error.message });
  }
};

// --- Delete a clinic ---
const deleteClinic = async (req, res) => {
  try {
    logger.info(`🗑️ [deleteClinic] Delete request for clinicId=${req.params.id} by user=${req.user?.email || 'unknown'}`);
    const { id } = req.params;

    const deleted = await Clinic.destroy({ where: { id } });

    if (!deleted) {
      logger.warn(`⚠️ [deleteClinic] Clinic not found for id=${id}`);
      return res.status(404).json({ message: "Clinic not found" });
    }

    logger.info(`✅ [deleteClinic] Clinic deleted successfully: id=${id}`);
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (error) {
    logger.error(`❌ [deleteClinic] Error deleting clinic: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  editClinic,
  deleteClinic
};
