const { Clinic, Organization, User, PatientRegistrationRequest } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');
const { transporter } = require("../utils/mailer");

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

  const endpoint = 'getClinicById';

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

// Send email notification for registration decision
const sendRegistrationDecisionEmail = async ({ to, status }) => {
  const approved = status === "approved";

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: approved
      ? "Your registration was approved"
      : "Your registration was rejected",
    html: approved
      ? `
      <p>Dear User,</p>

      <p>
        Your recent registration request has been <b>approved</b> at
        <b>New Hope LifeScan</b> Clinic! You have been successfully
        registered as a patient in our system.
      </p>

      <p>
        Kindly log in and continue with the onboarding process.
        In case of any questions or concerns, please contact
        us at <b>+1(681) 206-9434</b>.
      </p>

      <br />

      <p>Regards,<br />
      <b>New Hope LifeScan Team</b></p>
    `
      : `
      <p>Dear User,</p>

      <p>
        Your recent registration request has been <b>rejected</b> by
        <b>New Hope LifeScan</b> Clinic.
      </p>

      <p>
        Kindly contact us at <b>+1(681) 206-9434</b> for more information.
      </p>

      <br />

      <p>Regards,<br />
      <b>New Hope LifeScan Team</b></p>
    `
  });
};

// Approve or reject a patient registration request
const updateRegistrationRequestStatus = async (req, res) => {
  const endpoint = "updateRegistrationRequestStatus";
  const { requestId } = req.params;
  const { action } = req.body;

  logger.info(
    `[${endpoint}] Incoming update for request ${requestId} - action: ${action}`
  );

  if (!["approve", "reject"].includes(action)) {
    return res
      .status(400)
      .json({ error: "Invalid action. Must be 'approve' or 'reject'." });
  }

  let emailPayload;

  try {
    const {
      sequelize,
      PatientRegistrationRequest,
      User
    } = require("../models");

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
        const user = await User.findOne({
          where: { email: registrationRequest.emailId.toLowerCase() },
          transaction: t
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        await registrationRequest.update(
          {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          },
          { transaction: t }
        );

        emailPayload = {
          to: registrationRequest.emailId,
          status: "approved"
        };

        logger.info(`[${endpoint}] Request ${requestId} approved`);
      }

      if (action === "reject") {
        await registrationRequest.update(
          {
            status: "rejected",
            reviewedAt: new Date(),
            reviewedBy: req.user.id
          },
          { transaction: t }
        );

        emailPayload = {
          to: registrationRequest.emailId,
          status: "rejected"
        };

        logger.info(`[${endpoint}] Request ${requestId} rejected`);
      }
    });

    // Send email after transaction commits
    if (emailPayload) {
      try {
        await sendRegistrationDecisionEmail(emailPayload);
      } catch (emailErr) {
        logger.error(
          `[${endpoint}] Email failed for request ${requestId}: ${emailErr.message}`,
          { stack: emailErr.stack }
        );
      }
    }

    return res.status(200).json({
      message:
        action === "approve"
          ? "Registration request approved."
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

//convert user to patient and create patient record
const convertUserToPatient = async (req, res) => {
  const endpoint = "convertUserToPatient";
  const { requestId } = req.params;

  logger.info(`[${endpoint}] Converting user to patient for request ${requestId}`);

  try {
    const {
      sequelize,
      PatientRegistrationRequest,
      User,
      Patient,
      Clinic
    } = require("../models");

    await sequelize.transaction(async (t) => {
      const request = await PatientRegistrationRequest.findOne({
        where: {
          id: requestId,
          status: "approved",
          ...req.scopeFilter
        },
        transaction: t
      });

      if (!request) throw new Error("REQUEST_NOT_APPROVED");

      const user = await User.findOne({
        where: { email: request.emailId.toLowerCase() },
        transaction: t
      });

      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.role === "patient") throw new Error("ALREADY_PATIENT");

      // Find clinic
      const clinic = await Clinic.findOne({
        where: { clinicId: request.clinicId },
        transaction: t
      });
      if (!clinic) throw new Error("CLINIC_NOT_FOUND");

      // MRN generation (same logic as createPatient)
      function clinicPrefix(clinicId) {
        const parts = clinicId.split("-");
        const name = parts[0].substring(0, 3).toUpperCase();
        const number = parts[1] || "1";
        return `${name}${number}`;
      }

      const prefix = clinicPrefix(clinic.clinicId);

      const lastPatient = await Patient.findOne({
        where: { clinicId: clinic.clinicId },
        order: [["mrn", "DESC"]],
        limit: 1,
        transaction: t
      });

      let lastSeq = 1000;
      if (lastPatient?.mrn) {
        const num = parseInt(lastPatient.mrn.split("-")[1], 10);
        if (!isNaN(num)) lastSeq = num;
      }

      const mrn = `${prefix}-${lastSeq + 1}`;

      // Create patient record with all required fields
      await Patient.create(
        {
          userId: user.id,
          clinicId: clinic.clinicId,
          organizationId: request.organizationId,
          name: request.name,
          emailId: request.emailId.toLowerCase(),
          mrn,
          createdBy: req.user.id
        },
        { transaction: t }
      );

      // Update user role and link clinic/org
      await user.update(
        {
          role: "patient",
          clinicId: clinic.clinicId,
          organizationId: request.organizationId,
          registered: true
        },
        { transaction: t }
      );

      // Mark registration request as fulfilled
      await request.update(
        { fulfilledAt: new Date() },
        { transaction: t }
      );

      logger.info(`[${endpoint}] User ${user.id} converted to patient (MRN: ${mrn})`);
    });

    return res.status(200).json({
      message: "User successfully converted to patient."
    });

  } catch (error) {
    if (error.message === "REQUEST_NOT_APPROVED")
      return res.status(400).json({ error: "Request must be approved first." });
    if (error.message === "ALREADY_PATIENT")
      return res.status(400).json({ error: "User is already a patient." });
    if (error.message === "USER_NOT_FOUND")
      return res.status(404).json({ error: "User not found." });
    if (error.message === "CLINIC_NOT_FOUND")
      return res.status(404).json({ error: "Clinic not found." });

    logger.error(
      `[${endpoint}] Error converting user to patient: ${error.message}`,
      { stack: error.stack }
    );

    return res.status(500).json({ error: "Failed to convert user to patient." });
  }
};


module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  editClinic,
  deleteClinic,
  getRegistrationRequestsForClinic,
  updateRegistrationRequestStatus,
  convertUserToPatient
};
