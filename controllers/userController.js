const { User, Clinic, PatientRegistrationRequest } = require('../models');
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { Op, fn, col, where } = require("sequelize");
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');
const { sendOnboardingEmail } = require("../utils/onboardEmail");
dotenv.config();

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
const verifyUserByNameAndDob = async (req, res) => {
  const { name, dob } = req.body;

  if (!name || !dob) {
    return res.status(400).json({
      message: 'Name and DOB are required',
    });
  }

  const normalizedName = name.trim().toLowerCase();

  const patient = await Patient.findOne({
    where: {
      normalized_full_name: normalizedName,
      date_of_birth: dob,
    },
  });

  if (!patient) {
    return res.status(404).json({
      exists: false,
      message: 'No patient found',
    });
  }

  return res.status(200).json({
    exists: true,
    patientId: patient.id,
  });
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
        requestStatus: "REJECTED",
        canReRegister: true,
        nextAction: "REGISTER",
        message: "Your registration request was rejected. Please resubmit the form."
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
      organizationId,
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
      organizationId: process.env.DEFAULT_ORGANIZATION_ID,
      clinicId: process.env.DEFAULT_CLINIC_ID,
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

// Check registration state and decide next action
const checkRegistrationState = async (req, res) => {
  const endpoint = "checkRegistrationState";
  const userId = req.user.id;

  logger.info(`[${endpoint}] Checking registration state for user ${userId}`);

  try {
    const {
      PatientRegistrationRequest,
      Patient,
      User
    } = require("../models");

    // Fetch user (for role safety)
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user is already a patient → go to dashboard
    if (user.role === "patient") {
      return res.status(200).json({
        requestStatus: "COMPLETED",
        nextAction: "DASHBOARD"
      });
    }

    // Check if patient record already exists (extra safety)
    const patient = await Patient.findOne({
      where: {
        userId,
        ...req.scopeFilter
      }
    });

    if (patient) {
      return res.status(200).json({
        requestStatus: "COMPLETED",
        nextAction: "DASHBOARD"
      });
    }

    // Fetch latest registration request (if any)
    const request = await PatientRegistrationRequest.findOne({
      where: {
        emailId: user.email.toLowerCase(),
        ...req.scopeFilter
      },
      order: [["createdAt", "DESC"]]
    });

    // No registration request yet
    if (!request) {
      return res.status(200).json({
        requestStatus: "NONE",
        nextAction: "REGISTER"
      });
    }

    // Decide next action based on request status
    switch (request.status) {
      case "pending":
        return res.status(200).json({
          requestStatus: "PENDING",
          nextAction: "WAIT",
          message: "Your registration request is under review."
        });

      case "approved":
        return res.status(200).json({
          requestStatus: "APPROVED",
          nextAction: "CONVERT_TO_PATIENT",
          message: "Your registration request was approved."
        });

      case "rejected":
        return res.status(200).json({
          requestStatus: "REJECTED",
          nextAction: "REGISTER",
          canReRegister: true,
          message: "Your registration request was rejected."
        });

      default:
        logger.warn(
          `[${endpoint}] Unknown request status: ${request.status}`
        );
        return res.status(500).json({
          error: "Invalid registration state."
        });
    }

  } catch (error) {
    logger.error(
      `[${endpoint}] Error checking registration state: ${error.message}`,
      { stack: error.stack }
    );
    return res
      .status(500)
      .json({ error: "Failed to determine registration state." });
  }
};


//onboard clinic staff (work email + default password + onboarding email)
// onboard clinic staff (work email + onboarding email)
const createStaffUser = async (req, res) => {
  const endpoint = "createStaffUser";

  console.log("BODY FOR CREATE STAFF", req.body);

  logger.info(`[${endpoint}] Request received`, {
    body: {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      personalEmail: req.body.personalEmail,
      role: req.body.role,
      organizationId: req.body.organizationId,
      clinicId: req.body.clinicId
    }
  });

  try {
    const { firstName, lastName, personalEmail, role, organizationId, clinicId } = req.body;

    if (!firstName || !lastName || !personalEmail || !role || !organizationId || !clinicId) {
      logger.warn(`[${endpoint}] Missing required fields`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const workEmail =
      `${firstName.toLowerCase().replace(/\s+/g, ".")}.` +
      `${lastName.toLowerCase().replace(/\s+/g, ".")}@newhopelifescan.com`;

    logger.info(`[${endpoint}] Generated work email`, { workEmail });

    const existingUser = await User.findOne({ where: { email: workEmail } });

    if (existingUser) {
      logger.warn(`[${endpoint}] User already exists`, { workEmail });
      return res.status(400).json({ error: "User already exists" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    logger.info(`[${endpoint}] Creating user in database`, { workEmail });

    const user = await User.create({
      name: fullName,
      email: workEmail,
      personalEmail,
      role,
      password: null,
      accountStatus: "pending",
      onboardingToken: token,
      onboardingTokenExpiresAt: expiresAt,
      isActive: true,
      organizationId: process.env.DEFAULT_ORGANIZATION_ID,
      clinicId
    });

    logger.info(`[${endpoint}] User created successfully`, {
      userId: user.id,
      email: user.email
    });

    await sendOnboardingEmail(personalEmail, workEmail, token);

    logger.info(`[${endpoint}] Onboarding email sent`, {
      personalEmail,
      workEmail
    });

    return res.status(201).json({
      message: "Staff user created and onboarding email sent",
      userId: user.id
    });

  } catch (error) {
    logger.error(
      `[${endpoint}] Error creating staff user: ${error.message}`,
      { stack: error.stack }
    );
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Setup password for new staff user using token from email
// Setup password for new staff user using token
const setupPassword = async (req, res) => {
  const endpoint = "setupPassword";

  logger.info(`[${endpoint}] Setup password request received`);

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      logger.warn(`[${endpoint}] Missing token or password`);
      return res.status(400).json({ error: "Missing token or password" });
    }

    logger.info(`[${endpoint}] Looking up user by onboarding token`);

    const user = await User.findOne({
      where: { onboardingToken: token }
    });

    if (!user) {
      logger.warn(`[${endpoint}] Invalid onboarding token`);
      return res.status(400).json({ error: "Invalid token" });
    }

    if (user.onboardingTokenExpiresAt < new Date()) {
      logger.warn(`[${endpoint}] Onboarding token expired`, {
        userId: user.id
      });
      return res.status(400).json({ error: "Token expired" });
    }

    logger.info(`[${endpoint}] Token valid. Hashing password`, {
      userId: user.id
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.accountStatus = "active";
    user.onboardingToken = null;
    user.onboardingTokenExpiresAt = null;

    await user.save();

    logger.info(`[${endpoint}] Password setup complete`, {
      userId: user.id
    });

    return res.status(200).json({
      message: "Password set successfully"
    });

  } catch (error) {
    logger.error(
      `[${endpoint}] Error setting up password: ${error.message}`,
      { stack: error.stack }
    );
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  createStaffUser,
  setupPassword,
  welcomeNewUser,
  registerUserAsPatient,
  getUserbyEmail,
  getUserByPhone,
  verifyUserByNameAndDob,
  checkRegistrationState
};
