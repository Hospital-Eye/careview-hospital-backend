const { Clinic, Organization, User, PatientRegistrationRequest } = require('../models');
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
  const endpoint = 'getClinics';
  const userEmail = req.user?.email || 'unknown';
  const userRole = req.user?.role?.toLowerCase();
  const userOrg = req.params?.organizationId || 'unknown';

  logger.info(`[${endpoint}] Incoming request to view clinics for org=${userOrg} by user=${userEmail} role=${userRole}`);

  try {
    const filter = req.scopeFilter || {};

    const clinics = await Clinic.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'managers',
          where: { role: 'manager' },
          required: false
        }
      ]
    });

    //restricted fields for role 'patient'
    if (userRole === 'patient') {
      const limitedClinics = clinics.map(c => ({
        clinicId: c.id,
        organizationId: c.organizationId,
        name: c.name,
        registrationNumber: c.registrationNumber,
        dateOfEstablishment: c.dateOfEstablishment,
        type: c.type,
        address: c.address,
        location: c.location
      }));

      return res.status(200).json(limitedClinics);
    }

    // ⭐ All other roles → return full data
    return res.status(200).json(clinics);

  } catch (error) {
    logger.error(
      `[${endpoint}] Error fetching clinics: ${error.message}`,
      { stack: error.stack }
    );
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
      "location",
      "contactPhone",
      "contactEmail",
      "registrationNumber",
      "type",
      "dateOfEstablishment",
      "clinicId"
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

// Get all registration requests for a clinic
const getRegistrationRequestsForClinic = async (req, res) => {
  const endpoint = "getRegistrationRequestsForClinic";

  logger.info(`[${endpoint}] Fetching registration requests with scope: ${JSON.stringify(req.scopeFilter)}`);

  try {
    const { PatientRegistrationRequest, User } = require("../models");

    //Pull all PENDING requests that match the injected scope filter
    const requests = await PatientRegistrationRequest.findAll({
      where: {
        ...req.scopeFilter
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "name"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      count: requests.length,
      filterApplied: req.scopeFilter,
      requests
    });

  } catch (error) {
    logger.error(
      `[${endpoint}] Error fetching registration requests: ${error.message}`,
      { stack: error.stack }
    );
    return res
      .status(500)
      .json({ error: "Failed to fetch registration requests." });
  }
};

// Approve or reject a patient registration request
const updateRegistrationRequestStatus = async (req, res) => {
  const endpoint = "updateRegistrationRequestStatus";
  const { requestId } = req.params;
  const { action } = req.body; // "approve" | "reject"

  logger.info(
    `[${endpoint}] Incoming update for request ${requestId} - action: ${action}`
  );

  try {
    const {
      sequelize,
      PatientRegistrationRequest,
      User,
      Patient
    } = require("../models");

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action. Must be 'approve' or 'reject'." });
    }

    // Wrap everything in a transaction
    await sequelize.transaction(async (t) => {
      const registrationRequest = await PatientRegistrationRequest.findOne({
        where: {
          id: requestId,
          ...req.scopeFilter
        },
        transaction: t
      });

      if (!registrationRequest) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (registrationRequest.status !== "pending") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      if (action === "approve") {
        logger.info(`[${endpoint}] Approving request ${requestId}`);

        const user = await User.findOne({
          where: { email: registrationRequest.emailId.toLowerCase() },
          transaction: t
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        // Update request
        await registrationRequest.update(
          {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          },
          { transaction: t }
        );

        logger.info(
          `[${endpoint}] Request ${requestId} approved and patient created`
        );
      }

      if (action === "reject") {
        logger.info(`[${endpoint}] Rejecting request ${requestId}`);

        await registrationRequest.update(
          {
            status: "rejected",
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          },
          { transaction: t }
        );
      }
    });

    return res.status(200).json({
      message:
        action === "approve"
          ? "Registration request approved and patient created."
          : "Registration request rejected."
    });
  } catch (error) {
    if (error.message === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ error: "Request not found" });
    }

    if (error.message === "REQUEST_NOT_PENDING") {
      return res
        .status(400)
        .json({ error: "Only pending requests can be updated." });
    }

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "Associated user not found." });
    }

    logger.error(
      `[${endpoint}] Error updating registration request: ${error.message}`,
      { stack: error.stack }
    );

    return res
      .status(500)
      .json({ error: "Failed to update registration request." });
  }
};

module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  editClinic,
  deleteClinic,
  getRegistrationRequestsForClinic,
  updateRegistrationRequestStatus
};
