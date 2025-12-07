const { Scan, Patient, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const path = require("path");
const fs = require("fs");
const { logger } = require('../utils/logger');
const PDFDocument = require("pdfkit");

//GET all scans
const getScans = async (req, res) => {
  const endpoint = 'getScans';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all scans received from user: ${userEmail}`);

  try {
    const filter = { ...req.scopeFilter };

    //apply filters from query
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.mrn) filter.mrn = req.query.mrn;

    const scans = await Scan.findAll({
      where: filter,
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'mrn', 'emailId'] },
        { model: User, as: 'uploader', attributes: ['name', 'role', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (scans.length === 0) {
      logger.warn(`[${endpoint}] No scans found for filter: ${JSON.stringify(filter)}`);
      return res.status(200).json([]);
    }

    logger.info(`[${endpoint}] Fetched ${scans.length} scans from database`);
    res.status(200).json(scans);

  } catch (err) {
    logger.error(`[${endpoint}] Error in getScans: ${err.stack}`);
    res.status(500).json({ error: "Server error while fetching scans" });
  }
};

//Upload a Scan
const uploadScan = async (req, res) => {
  const endpoint = 'uploadScan';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to upload a new scan from user: ${userEmail}`);

  try {
    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    logger.debug(`[${endpoint}] Upload request body: ${JSON.stringify({ patientName, mrn, scanType, urgencyLevel })}`);
    logger.debug(`[${endpoint}] Uploader info: ${JSON.stringify({ id: req.user?.id, email: req.user?.email, role: req.user?.role })}`);

    //find patient by name + MRN
    const patient = await Patient.findOne({ where: { name: patientName, mrn } });
    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for name="${patientName}" and MRN="${mrn}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

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


    logger.info(`[${endpoint}] New scan uploaded successfully by ${req.user?.email || 'unknown'} for patient MRN=${mrn}`);

    res.status(201).json(scan);

  } catch (err) {
    logger.error(`[${endpoint}] Error in uploadScan: ${err.stack}`);
    res.status(500).json({ error: "Server error while uploading scan" });
  }
};

// GET all scans by patientId
const getScansByPatientId = async (req, res) => {
  const endpoint = "getScansByPatientId";
  const userEmail = req.user?.email || "unknown";
  const patientId = req.params.patientId;

  logger.info(
    `[${endpoint}] Request to view scans of patientId=${patientId} received from user: ${userEmail}`
  );

  try {
    // Find the patient by ID
    const patient = await Patient.findOne({ where: { id: patientId } });

    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for patientId="${patientId}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    // Fetch ALL scans for this patient
    const scans = await Scan.findAll({
      where: { patientId },
      include: [
        { model: Patient, as: "patient" },
        { 
          model: User, 
          as: "uploader",
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!scans.length) {
      logger.warn(`[${endpoint}] No scans found for patientId=${patient.id}`);
      return res.status(404).json({ error: "No scans found for this patient" });
    }

    logger.info(
      `[${endpoint}] Found ${scans.length} scans for patientId=${patientId}`
    );

    // Build response objects for each scan
    const scanResponses = scans.map((scan) => {
      const filePath = path.join(__dirname, "..", scan.fileUrl);

      // Safe check for missing file
      let fileData = null;
      if (fs.existsSync(filePath)) {
        fileData = fs.readFileSync(filePath, { encoding: "base64" });
      } else {
        logger.error(
          `[${endpoint}] Missing scan file on disk for ScanID=${scan.id}, path="${filePath}"`
        );
      }

      return {
        id: scan.id,
        patientId: scan.patientId,
        mrn: patient.mrn,
        uploadedBy: scan.uploader ? scan.uploader.name : null,
        uploader: scan.uploader || null,
        scanType: scan.scanType,
        urgencyLevel: scan.urgencyLevel,
        status: scan.status,
        notes: scan.notes,
        createdAt: scan.createdAt,
        file: fileData
          ? {
              mimetype: scan.fileType || "image/jpeg",
              data: fileData,
            }
          : null,
      };
    });

    return res.status(200).json(scanResponses);

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return res.status(500).json({
      error: "Server error while fetching scans",
    });
  }
};

//Add Doctor Review by Scan ID (preferred)
const addDoctorReviewByScanId = async (req, res) => {
  const endpoint = "addDoctorReviewByScanId";
  const userEmail = req.user?.email || "unknown";

  logger.info(`[${endpoint}] Incoming request from: ${userEmail}`);

  try {
    const { scanId } = req.params;
    const { notes } = req.body;

    logger.debug(`[${endpoint}] scanId received: ${scanId}`);

    const scan = await Scan.findOne({ where: { id: scanId } });

    if (!scan) {
      logger.warn(`[${endpoint}] Scan not found for scanId="${scanId}"`);
      return res.status(404).json({ error: "Scan not found" });
    }

    logger.info(`[${endpoint}] Scan found. scanId=${scan.id}, patientId=${scan.patientId}`);

    //load the patient from scan.patientId
    const patient = await Patient.findOne({ where: { id: scan.patientId } });

    if (!patient) {
      logger.warn(`[${endpoint}] Invalid scan — patient not found for patientId=${scan.patientId}`);
      return res.status(404).json({ error: "Patient not found for this scan" });
    }

    logger.info(`[${endpoint}] Patient found: ID=${patient.id}`);

    //update status
    const updateFields = {
      notes: notes || scan.notes,
      status: "Reviewed",
    };

    if (req.file) {
      const imageUrl = `/uploads/reviews/${req.file.filename}`;
      updateFields.doctorReviewUrl = imageUrl;

      logger.info(`[${endpoint}] Doctor review image saved: ${imageUrl}`);
    }

    await scan.update(updateFields);

    logger.info(`[${endpoint}] Doctor review saved for scanId=${scan.id}`);

    return res.status(200).json({
      message: "Doctor review saved",
      scan,
    });

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return res.status(500).json({ error: "Server error while saving doctor review" });
  }
};

//generate report pdf (currently contains doctor's notes + images if any)
const generateReport = async (req, res) => {
  const endpoint = "generateReport";
  const userEmail = req.user?.email || "unknown";
  const { scanId } = req.params;

  logger.info(`[${endpoint}] Incoming request by user: ${userEmail} to generate report for scanId=${scanId}`);

  try {
    const scan = await Scan.findOne({ where: { id: scanId } });
    if (!scan) {
      logger.warn(`[${endpoint}] Scan not found for scanId=${scanId}`);
      return res.status(404).json({ error: "Scan not found" });
    }
    logger.info(`[${endpoint}] Found scan: ID=${scan.id}, patientId=${scan.patientId}`);

    const patient = await Patient.findOne({ where: { id: scan.patientId } });
    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for patientId=${scan.patientId}`);
      return res.status(404).json({ error: "Patient not found" });
    }
    logger.info(`[${endpoint}] Patient found: ID=${patient.id}, Name=${patient.name}`);

    //Create PDF document
    const doc = new PDFDocument();
    logger.debug(`[${endpoint}] PDF document created`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=DoctorReview_${scan.id}.pdf`
    );
    logger.debug(`[${endpoint}] Response headers set for PDF download`);

    doc.pipe(res);
    logger.debug(`[${endpoint}] PDF piped to response`);

    //Add PDF content
    doc.fontSize(20).text("Doctor Review Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Patient: ${patient.name}`);
    doc.text(`Patient ID: ${patient.id}`);
    doc.text(`Scan ID: ${scan.id}`);
    doc.text(`Status: ${scan.status}`);
    doc.moveDown();

    doc.fontSize(16).text("Doctor Notes:");
    doc.fontSize(14).text(scan.notes || "No notes provided");
    doc.moveDown();

    //Include image if uploaded
    if (scan.doctorReviewUrl) {
      const imagePath = path.join(__dirname, "..", scan.doctorReviewUrl);
      if (fs.existsSync(imagePath)) {
        doc.fontSize(16).text("Doctor Review Image:");
        doc.image(imagePath, { fit: [400, 400], align: "center" });
        logger.info(`[${endpoint}] Doctor review image embedded in PDF from ${imagePath}`);
      } else {
        doc.fontSize(14).text(`Image available at: ${scan.doctorReviewUrl}`);
        logger.warn(`[${endpoint}] Image file not found at ${imagePath}, added URL instead`);
      }
    } else {
      logger.info(`[${endpoint}] No doctor review image found for scanId=${scan.id}`);
    }

    //Finalize PDF
    doc.end();
    logger.info(`[${endpoint}] PDF generation completed for scanId=${scan.id}`);
  } catch (err) {
    logger.error(`[${endpoint}] Error generating PDF for scanId=${scanId}: ${err.stack}`);
    return res.status(500).json({ error: "Server error while generating report" });
  }
};

//view doctor's notes per scan
const getDoctorReviewByScanId = async (req, res) => {
  const endpoint = "getDoctorReviewByScanId";

  try {
    const { scanId } = req.params;

    logger.info(`[${endpoint}] Fetching doctor review for scanId: ${scanId}`);

    const scan = await Scan.findOne({
      where: { id: scanId },
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "fullName", "email"]
        }
      ]
    });

    if (!scan) {
      logger.warn(`[${endpoint}] No scan found for scanId: ${scanId}`);
      return res.status(404).json({
        success: false,
        error: "Scan not found"
      });
    }

    return res.status(200).json({
      success: true,
      review: {
        scanId: scan.id,
        status: scan.status,
        notes: scan.notes,
        doctorReviewUrl: scan.doctorReviewUrl,
        createdAt: scan.createdAt,
      }
    });

  } catch (error) {
    logger.error(`[${endpoint}] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch doctor review for this scan"
    });
  }
};



module.exports = { getScans, uploadScan, getScansByPatientId, addDoctorReviewByScanId, generateReport, getDoctorReviewByScanId };
