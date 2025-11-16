const { Scan, Patient, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const path = require("path");
const fs = require("fs");
const logger = require('../utils/logger');

//GET all scans
const getScans = async (req, res) => {
  logger.info('GET /scans endpoint hit');

  try {
    const filter = { ...req.scopeFilter };

    //apply filters from query
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.mrn) filter.mrn = req.query.mrn;

    logger.debug(`Filters applied: ${JSON.stringify(filter)}`);

    const scans = await Scan.findAll({
      where: filter,
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'mrn', 'emailId'] },
        { model: User, as: 'uploader', attributes: ['name', 'role', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (scans.length === 0) {
      logger.warn(`No scans found for filter: ${JSON.stringify(filter)}`);
      return res.status(200).json([]);
    }

    logger.info(`Fetched ${scans.length} scans from database`);
    res.status(200).json(scans);

  } catch (err) {
    logger.error(`Error in getScans: ${err.stack}`);
    res.status(500).json({ error: "Server error while fetching scans" });
  }
};

//Upload a Scan
const uploadScan = async (req, res) => {
  logger.info('POST /scans/upload endpoint hit');

  try {
    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    logger.debug(`Upload request body: ${JSON.stringify({ patientName, mrn, scanType, urgencyLevel })}`);
    logger.debug(`Uploader info: ${JSON.stringify({ id: req.user?.id, email: req.user?.email, role: req.user?.role })}`);

    //find patient by name + MRN
    const patient = await Patient.findOne({ where: { name: patientName, mrn } });
    if (!patient) {
      logger.warn(`Patient not found for name="${patientName}" and MRN="${mrn}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    logger.info(`Patient found: ID=${patient.id}, MRN=${patient.mrn}, Org=${patient.organizationId}`);

    //create new scan record
    const scan = await Scan.create({
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      patientId: patient.id,
      mrn: patient.mrn,
      uploadedBy: req.user.id,
      scanType,
      urgencyLevel,
      fileUrl: `/uploads/scans/${req.file.filename}`, 
      notes,
    });

    logger.info(`New scan uploaded successfully by ${req.user?.email || 'unknown'} for patient MRN=${mrn}`);
    logger.debug(`Created scan record: ${JSON.stringify(scan.toJSON())}`);

    res.status(201).json(scan);

  } catch (err) {
    logger.error(`Error in uploadScan: ${err.stack}`);
    res.status(500).json({ error: "Server error while uploading scan" });
  }
};

//GET scans by MRN (metadata + image file content)
const getScanByMrn = async (req, res) => {
  logger.info("GET /scans/:mrn endpoint hit");

  try {
    const { mrn } = req.params;
    logger.debug(`Request param MRN: ${mrn}`);

    //find patient by MRN
    const patient = await Patient.findOne({ where: { mrn } });
    if (!patient) {
      logger.warn(`Patient not found for MRN="${mrn}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    logger.info(`Patient found: ID=${patient.id}, MRN=${mrn}`);

    //find the most recent scan for this patient
    const scan = await Scan.findOne({
      where: { patientId: patient.id },
      include: [{ model: Patient, as: "uploadedBy", attributes: ["name", "role"] }],
      order: [["createdAt", "DESC"]],
    });

    if (!scan) {
      logger.warn(`No scans found for patient ID=${patient.id}, MRN="${mrn}"`);
      return res.status(404).json({ error: "No scans found for this MRN" });
    }

    logger.info(`Latest scan found: ScanID=${scan.id}, UploadedBy=${scan.uploadedBy}`);

    //check if file exists
    const filePath = path.join(__dirname, "..", scan.fileUrl);
    logger.debug(`Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      logger.error(`Scan file missing on disk for ScanID=${scan.id}, path="${filePath}"`);
      return res.status(404).json({ error: "Scan file not found" });
    }

    //read file content
    const fileData = fs.readFileSync(filePath, { encoding: "base64" });
    logger.info(`Successfully read scan file for MRN=${mrn}`);

    //respond with metadata + base64 file
    res.status(200).json({
      id: scan.id,
      patientId: scan.patientId,
      mrn: scan.mrn,
      uploadedBy: scan.uploadedBy,
      scanType: scan.scanType,
      urgencyLevel: scan.urgencyLevel,
      status: scan.status,
      notes: scan.notes,
      createdAt: scan.createdAt,
      file: {
        mimetype: scan.fileType || "image/jpeg",
        data: fileData,
      },
    });
  } catch (err) {
    logger.error(`Error in getScanByMrn: ${err.stack}`);
    res.status(500).json({ error: "Server error while fetching scan" });
  }
};

//Add Doctor Review by MRN ---
const addDoctorReviewByMrn = async (req, res) => {
  logger.info("POST /scans/:mrn/review endpoint hit");

  try {
    const { mrn } = req.params;
    const { notes, scanId } = req.body;

    logger.debug(`Incoming doctor review - MRN: ${mrn}, scanId: ${scanId || "latest"}`);

    //find patient
    const patient = await Patient.findOne({ where: { mrn } });
    if (!patient) {
      logger.warn(`Patient not found for MRN="${mrn}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    logger.info(`Patient found: ID=${patient.id}, MRN=${mrn}`);

    //identify the scan 
    let scan;
    if (scanId) {
      logger.debug(`Fetching scan by explicit ID=${scanId} for patient ID=${patient.id}`);
      scan = await Scan.findOne({ where: { id: scanId, patientId: patient.id } });
    } else {
      logger.debug(`Fetching latest scan for patient ID=${patient.id}`);
      scan = await Scan.findOne({
        where: { patientId: patient.id },
        order: [["createdAt", "DESC"]],
      });
    }

    if (!scan) {
      logger.warn(`No scan found for MRN="${mrn}", scanId=${scanId || "latest"}`);
      return res.status(404).json({ error: "Scan not found" });
    }

    logger.info(`Reviewing scan ID=${scan.id}, PatientID=${patient.id}, MRN=${mrn}`);

    //update scan with review details
    await scan.update({
      notes: notes || scan.notes,
      status: "Reviewed",
    });

    logger.info(`Doctor review successfully saved for ScanID=${scan.id}, MRN=${mrn}`);

    res.status(200).json({ message: "Doctor review saved", scan });
  } catch (err) {
    logger.error(`Error adding doctor review for MRN=${req.params?.mrn}: ${err.stack}`);
    res.status(500).json({ error: "Server error while saving review" });
  }
};


module.exports = { getScans, uploadScan, getScanByMrn, addDoctorReviewByMrn };
