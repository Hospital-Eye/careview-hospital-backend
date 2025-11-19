const { Clinic, Organization, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new clinic
const createClinic = async (req, res) => {
  const endpoint = 'createClinic';
  const userEmail = req.user?.email || 'unknown';
  const userOrg = req.user?.organizationId || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create clinic in organization: ${userOrg} received from user=${userEmail}`);

  try {

    const { name, registrationNumber, type, address, contactEmail, contactPhone } = req.body;
    const { organizationId } = req.user;

    if (!organizationId) {
      logger.warn(`[${endpoint}] Missing organizationId`);
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    if (!name) {
      logger.warn(`[${endpoint}] Clinic name missing`);
      return res.status(400).json({ error: "Clinic name is required" });
    }

    //extract first two words
    let base = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('')
      .toLowerCase();

    //extract ending -number if present
    const numberMatch = name.match(/-(\d+)$/);

    let clinicId = base;

    if (numberMatch) {
      clinicId = `${base}-${numberMatch[1]}`;
    }

    const clinic = await Clinic.create({
      clinicId,
      organizationId,
      name,
      dateOfEstablishment: req.body.dateOfEstablishment || null,
      registrationNumber,
      type,
      address,
      contactEmail,
      contactPhone
    });

    logger.info(`[${endpoint}] Clinic created successfully: id=${clinic.id}, clinicId=${clinic.clinicId}`);
    res.status(201).json(clinic);

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Get all clinics (with managers)
const getClinics = async (req, res) => {

  const endpoint = 'editClinic';
  const userEmail = req.user?.email || 'unknown';
  const userOrg = req.params?.organizationId || 'unknown';
  
  logger.info(`${endpoint}] Incoming request to view all clinics belonging to organization: ${userOrg} by user=${userEmail}`);

  try {
    logger.info(`[${endpoint}] Incoming request to view all clinics from user=${req.user?.email || 'unknown'}`);
    const filter = req.scopeFilter || {};

    const clinics = await Clinic.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'managers',           
          where: { role: 'manager' },
          required: false           //include clinics even if they have no managers
        }
      ]
    });

    res.status(200).json(clinics);

  } catch (error) {
    logger.error(`[${endpoint}] Error fetching clinics: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: "Server error" });
  }
};


//Get a clinic by clinicId
const getClinicById = async (req, res) => {

  const endpoint = 'editClinic';
  const userEmail = req.user?.email || 'unknown';
  const userOrg = req.params?.organizationId || 'unknown';
  
  logger.info(`[${endpoint}] Incoming request to edit clinicId=${req.params.id} belonging to organization: ${userOrg} by user=${userEmail}`);

  try {
    logger.info(`[${endpoint}] Request received for viewing clinic having clinicId=${req.params.id}`);
    const clinic = await Clinic.findOne({ where: { clinicId: req.params.id } });

    if (!clinic) {
      logger.warn(`[${endpoint}] No clinic found for clinicId=${req.params.id}`);
      return res.status(404).send();
    }

    logger.info(`${endpoint}] Clinic found: id=${clinic.id}, name=${clinic.name}`);
    res.status(200).send(clinic);
  } catch (error) {
    logger.error(`${endpoint}] Error fetching clinic: ${error.message}`, { stack: error.stack });
    res.status(500).send(error);
  }
};

//Edit a clinic
const editClinic = async (req, res) => {
  const endpoint = 'editClinic';
  const userEmail = req.user?.email || 'unknown';
  const userOrg = req.params?.organizationId || 'unknown';

  logger.info(`[${endpoint}] Update request for clinicId=${req.params.id} belonging to organization: ${userOrg} by user=${userEmail}`);

  try {
    logger.info(
      `[${endpoint}] Update request for clinicId=${req.params.id} by user=${req.user?.email || "unknown"}`
    );

    const { id } = req.params;
    const clinic = await Clinic.findByPk(id);

    if (!clinic) {
      logger.warn(`[${endpoint}] Clinic not found for id=${id}`);
      return res.status(404).json({ message: "Clinic not found" });
    }

    //only fields present in req.body are updated
    const allowedFields = [
      "name",
      "address",
      "contactNumber",
      "email",
      "city",
      "state",
      "zipcode",
      "managerId",
      "clinicType",
      "organizationId"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      logger.warn(`[${endpoint}] No valid fields provided for update`);
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    await clinic.update(updates);

    logger.info(`[${endpoint}] Clinic updated successfully: id=${id}`);

    res.status(200).json(clinic);
  } catch (error) {
    logger.error(`[${endpoint}] Error updating clinic: ${error.message}`, {
      stack: error.stack
    });
    res.status(400).json({ error: error.message });
  }
};


//Delete a clinic
const deleteClinic = async (req, res) => {
  const endpoint = 'deleteClinic';
  const userEmail = req.user?.email || 'unknown';
  const userOrg = req.user?.organizationId || 'unknown';

  logger.info(`[${endpoint}] Delete request for clinicId: ${req.params.id} from organization: ${userOrg} by user=${userEmail}`); 

  try {
    const { id } = req.params;

    const deleted = await Clinic.destroy({ where: { id } });

    if (!deleted) {
      logger.warn(`[${endpoint}] Clinic not found for id=${id}`);
      return res.status(404).json({ message: "Clinic not found" });
    }

    logger.info(`[${endpoint}] Clinic deleted successfully: id=${id}`);
    res.status(200).json({ message: "Clinic deleted successfully" });
  } catch (error) {
    logger.error(`[${endpoint}] Error deleting clinic: ${error.message}`, { stack: error.stack });
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
