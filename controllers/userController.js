const { User, Clinic, PatientRegistrationRequest } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new user session
const createUser = async (req, res) => {
  const endpoint = 'createUser';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create a new user from user: ${userEmail}`);

  try {
    const user = await User.create(req.body);
    logger.info(`[${endpoint}] User created successfully with ID=${user.id}`);
    res.status(201).json(user);
  } catch (err) {
    logger.error(`[${endpoint}] Error creating user: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Get all user sessions
const getUsers = async (req, res) => {
  const endpoint = 'getUsers';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all users received from user: ${userEmail}`);

  try {
    const users = await User.findAll();
    logger.info(`[${endpoint}] Fetched ${users.length} users from database`);
    res.json(users);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching users: ${err.stack}`);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserbyEmail = async (req, res) => {
  const endpoint = 'getUserbyEmail';
  const userEmail = req.query.email || 'unknown';

  logger.info(`[${endpoint}] Request to view user by email received from user: ${userEmail}`);

  try {
    const user = await User.findOne({ where: { email: userEmail } });
    logger.info(`[${endpoint}] Fetched user by email: ${userEmail}`);
    return res.status(200).json(user);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching user by email: ${err.stack}`);
    return res.status(500).json({ error: 'Server error' });
  }
};

//check if user exists by phone number
const getUserByPhone = async (req, res) => {
  const endpoint = 'getUserByPhone';
  const userPhone = req.query.phone || 'unknown';

  logger.info(`[${endpoint}] Request to view user by phone received from user: ${userPhone}`);

  try {
    const user = await User.findOne({ where: { phone: userPhone } });
    logger.info(`[${endpoint}] Fetched user by phone: ${userPhone}`);
    return res.status(200).json(user);
  } catch (err) {
    logger.error(
      `[${endpoint}] Error fetching user by phone: ${err.stack}`
    );
    return res.status(500).json({ error: 'Server error' });
  }
};

//check if user exists by dob+name combination
const verifyUserByPhoneAndName = async (req, res) => {
  const endpoint = 'verifyUserByPhoneAndName';
  const { phone, name } = req.query;

  logger.info(`[${endpoint}] Verification request received | phone: ${phone || 'unknown'}, name: ${name || 'unknown'}`);

  if (!phone || !name) {
    logger.warn(`[${endpoint}] Missing phone or name`);
    return res.status(400).json({
      exists: false,
      message: 'Phone number and name are required',
    });
  }

  try {
    const user = await User.findOne({
      where: {
        phone,
        name,
      },
    });

    if (!user) {
      logger.info(
        `[${endpoint}] No user found for phone: ${phone}, name: ${name}`
      );
      return res.status(200).json({ exists: false });
    }

    logger.info(
      `[${endpoint}] User verified for phone: ${phone}, name: ${name}`
    );
    return res.status(200).json({
      exists: true,
      userId: user.id, // optional but useful
    });
  } catch (err) {
    logger.error(
      `[${endpoint}] Error verifying user by phone and name: ${err.stack}`
    );
    return res.status(500).json({ error: 'Server error' });
  }
};



//Update a user session by ID
const updateUser = async (req, res) => {
  const endpoint = 'updateUser';
  const id = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to update user having id: ${id} received from user: ${userEmail}`);
  
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      logger.warn(`[${endpoint}] User not found for ID=${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(req.body);
    logger.info(`[${endpoint}] User updated successfully (ID=${id})`);
    res.json(user);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating user ID=${req.params.id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Delete a user session by ID
const deleteUser = async (req, res) => {
  const endpoint = 'deleteUser';
  const id = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to delete user having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const deleted = await User.destroy({ where: { id: id } });
    if (!deleted) {
      logger.warn(`[${endpoint}] Attempted to delete user, but not found (ID=${id})`);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`[${endpoint}] User deleted successfully (ID=${id})`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting user ID=${id}: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

// Welcome new user and check registration status
const welcomeNewUser = async (req, res) => {
  const endpoint = "welcomeNewUser";
  const userEmail = req.user?.email?.toLowerCase();

  logger.info(`[${endpoint}] Welcome check for ${userEmail}`);

  try {
    const { Patient, PatientRegistrationRequest } = require("../models");
    const userId = req.user.id;

    // Fully registered patient
    const patient = await Patient.findOne({ where: { userId } });
    if (patient) {
      return res.status(200).json({
        status: "ACTIVE",
        redirect: "/my-health"
      });
    }

    // Check registration request by EMAIL (source of truth)
    const request = await PatientRegistrationRequest.findOne({
      where: { emailId: userEmail }
    });

    if (!request) {
      return res.status(200).json({
        status: "NOT_REGISTERED",
        message: "Please register first."
      });
    }

    // Pending approval
    if (request.status === "pending") {
      return res.status(200).json({
        status: "PENDING",
        message: "Your request is being processed by your clinic."
      });
    }

    // Approved but not converted
    if (request.status === "approved") {
      return res.status(200).json({
        status: "APPROVED",
        message: "Your request is approved. Finalizing your account."
      });
    }

    // Rejected
    if (request.status === "rejected") {
      return res.status(200).json({
        status: "REJECTED",
        message: "Your registration request was rejected."
      });
    }

  } catch (error) {
    logger.error(`[${endpoint}] Error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


// Register new user as patient (send registration request to clinic)
const registerUserAsPatient = async (req, res) => {
  const endpoint = "registerUserAsPatient";
  const userEmail = req.user?.email?.toLowerCase() || "unknown";

  logger.info(`[${endpoint}] Registration request received from ${userEmail}`);

  try {
    const { PatientRegistrationRequest, Patient } = require("../models");
    const user = req.user;

    // Only non-patient users can register
    if (user.role?.toLowerCase() !== "user") {
      logger.warn(
        `[${endpoint}] Access denied for ${userEmail} — role: ${user.role}`
      );
      return res.status(403).json({
        error: "Only unregistered users can complete patient onboarding."
      });
    }

    const {
      name,
      dob,
      gender,
      phone,
      emailId,
      organizationId = "sigma-healthsense",
      clinicId,
      requiresIsolationPrecautions = false,
      allergies,
      diagnoses,
      emergencyContact
    } = req.body;

    // Required field validation
    if (!name || !dob || !gender || !phone || !emailId || !clinicId) {
      logger.warn(`[${endpoint}] Missing required fields from ${userEmail}`);
      return res.status(400).json({
        error: "Missing required fields."
      });
    }

    const normalizedEmail = emailId.trim().toLowerCase();

    // Prevent duplicate patient creation
    const existingPatient = await Patient.findOne({
      where: { userId: user.id }
    });

    if (existingPatient) {
      return res.status(409).json({
        error: "User is already a registered patient."
      });
    }

    // Prevent duplicate registration requests (any status)
    const existingRequest = await PatientRegistrationRequest.findOne({
      where: { emailId: normalizedEmail }
    });

    if (existingRequest) {
      return res.status(409).json({
        error: "A registration request already exists for this email.",
        status: existingRequest.status
      });
    }

    // Parse arrays safely
    const parsedAllergies = Array.isArray(allergies)
      ? allergies
      : typeof allergies === "string"
        ? allergies.split(",").map(a => a.trim()).filter(Boolean)
        : [];

    const parsedDiagnoses = Array.isArray(diagnoses)
      ? diagnoses
      : typeof diagnoses === "string"
        ? diagnoses.split(",").map(d => d.trim()).filter(Boolean)
        : [];

    // Emergency contact should be JSON or null
    const parsedEmergencyContact =
      typeof emergencyContact === "object" ? emergencyContact : null;

    // Create registration request
    const registrationRequest = await PatientRegistrationRequest.create({
      userId: user.id,
      name,
      dob,
      gender,
      phone,
      emailId: normalizedEmail,
      organizationId,
      clinicId,
      requiresIsolationPrecautions: Boolean(requiresIsolationPrecautions),
      allergies: parsedAllergies,
      diagnoses: parsedDiagnoses,
      emergencyContact: parsedEmergencyContact,
      status: "pending"
    });

    logger.info(
      `[${endpoint}] Registration request created for ${userEmail} (requestId: ${registrationRequest.id})`
    );

    return res.status(201).json({
      message: "Patient registration request sent successfully.",
      status: "PENDING",
      requestId: registrationRequest.id
    });

  } catch (error) {
    logger.error(
      `[${endpoint}] Error during registration request for ${userEmail}: ${error.message}`,
      { stack: error.stack }
    );

    return res.status(500).json({
      error: "Internal server error."
    });
  }
};
  

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  welcomeNewUser,
  registerUserAsPatient,
  getUserbyEmail,
  getUserByPhone,
  verifyUserByPhoneAndName
};
