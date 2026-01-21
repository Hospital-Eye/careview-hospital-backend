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

// new user welcome
const welcomeNewUser = async (req, res) => {
  const endpoint = "welcomeNewUser";
  const userEmail = req.user?.email || "unknown";

  logger.info(`[${endpoint}] Welcome check for ${userEmail}`);

  try {
    const { Patient, PatientRegistrationRequest } = require("../models");
    const userId = req.user.id;

    //Check if patient exists (fully registered)
    const patient = await Patient.findOne({ where: { userId } });
    if (patient) {
      logger.info(`[${endpoint}] Patient found for ${userEmail}. Redirecting to /my-health.`);
      return res.status(200).json({
        registered: true,
        redirect: "/my-health",
        message: "Patient profile found."
      });
    }

    //Check if a registration request is pending (user has already raised a request)
    const pendingRequest = await PatientRegistrationRequest.findOne({
      where: { userId, status: "pending" }
    });

    if (pendingRequest) {
      logger.info(`[${endpoint}] Registration request pending for ${userEmail}.`);
      return res.status(200).json({
        registered: true,
        message: "Your request is being processed by your clinic."
      });
    }

    //No patient record or pending request (user needs to register)
    logger.info(`[${endpoint}] No patient record for ${userEmail}. Needs registration.`);
    return res.status(200).json({
      registered: false,
      message: "Please register first."
    });

  } catch (error) {
    logger.error(`[${endpoint}] Error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Register new user as patient (send registration request to clinic)
const registerUserAsPatient = async (req, res) => {
  const endpoint = "registerUserAsPatient";
  const userEmail = req.user?.email || "unknown";

  logger.info(`[${endpoint}] Registration request received from ${userEmail}`);

  try {
    const user = req.user;

    //Only newly signed-up users can register
    if (user.role.toLowerCase() !== "user") {
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

    //Validate required fields
    if (!name || !dob || !gender || !phone || !emailId || !clinicId) {
      logger.warn(`[${endpoint}] Missing required fields from ${userEmail}`);
      return res.status(400).json({ error: "Missing required fields." });
    }

    //Parse arrays safely
    const parsedAllergies = allergies
      ? (Array.isArray(allergies) ? allergies : allergies.split(",").map(a => a.trim()).filter(Boolean))
      : [];

    const parsedDiagnoses = diagnoses
      ? (Array.isArray(diagnoses) ? diagnoses : diagnoses.split(",").map(d => d.trim()).filter(Boolean))
      : [];

    //Ensure emergencyContact is either JSON or null
    const parsedEmergencyContact = emergencyContact || null;

    //Create a registration request instead of patient
    const registrationRequest = await PatientRegistrationRequest.create({
      userId: user.id,
      name,
      dob,
      gender,
      phone,
      emailId,
      organizationId,
      clinicId,
      requiresIsolationPrecautions: Boolean(requiresIsolationPrecautions),
      allergies: parsedAllergies,
      diagnoses: parsedDiagnoses,
      emergencyContact: parsedEmergencyContact,
      status: "pending"
    });

    logger.info(
      `[${endpoint}] Patient registration request created for ${userEmail} (requestId: ${registrationRequest.id})`
    );

    //Mark user as registered (request in progress)
    await User.update(
      { registered: true },
      { where: { id: user.id } }
    );
    logger.info(`[${endpoint}] User marked as registered: ${userEmail}`);

    return res.status(201).json({
      message: "Patient registration request sent successfully.",
      registrationRequest
    });

  } catch (error) {
    logger.error(
      `[${endpoint}] Error during registration request for ${userEmail}: ${error.message}`,
      { stack: error.stack }
    );

    console.error(error);

    return res.status(500).json({ error: "Internal server error." });
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
  getUserByPhone
};
