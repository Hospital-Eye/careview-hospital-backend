const { Scan, Patient, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const path = require("path");
const fs = require("fs");
const { logger } = require('../utils/logger');
const PdfPrinter = require("pdfmake");

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
//Upload a Scan
const uploadScan = async (req, res) => {
  const endpoint = 'uploadScan';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to upload a new scan from user: ${userEmail}`);

  try {
    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    logger.debug(`[${endpoint}] Upload request body: ${JSON.stringify({ patientName, mrn, scanType, urgencyLevel })}`);
    logger.debug(`[${endpoint}] Uploader info: ${JSON.stringify({ id: req.user?.id, email: req.user?.email, role: req.user?.role })}`);

    // Debug log for file
    logger.debug(`[${endpoint}] req.file: ${JSON.stringify(req.file)}`);

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
      fileUrl: `/uploads/scans/${req.file?.filename}`,
      notes,
    });

    logger.info(`[${endpoint}] New scan uploaded successfully by ${req.user?.email || 'unknown'} for patient MRN=${mrn}`);

    return res.status(201).json(scan);

  } catch (err) {
    logger.error(`[${endpoint}] Error in uploadScan: ${err?.message}`);
    logger.error(`[${endpoint}] Full Error: ${JSON.stringify(err, null, 2)}`);
    logger.error(err); // prints stack if available

    return res.status(500).json({
      error: "Server error while uploading scan",
      details: err?.message,
    });
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


function addImageWithAutoPage(doc, imagePath) {
  try {
    const { width, height } = doc._imageSize(imagePath);
    const maxWidth = 400;
    const ratio = maxWidth / width;
    const scaledHeight = height * ratio;

    // If image will overflow page → add new page
    if (doc.y + scaledHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    doc.image(imagePath, {
      fit: [maxWidth, scaledHeight],
      align: "center"
    });

    doc.moveDown(2);
  } catch (err) {
    console.error("Error embedding image:", err);
    doc.fontSize(12).text("(Unable to load image)");
  }
}


//generate report
const generateReport = async (req, res) => {
  const { scanId } = req.params;
  const endpoint = "generateReport";

  try {
    const scan = await Scan.findOne({ where: { id: scanId } });
    if (!scan) return res.status(404).json({ error: "Scan not found" });

    const patient = await Patient.findOne({ where: { id: scan.patientId } });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    let fonts = {
      Roboto: {
        normal: "node_modules/pdfmake/fonts/Roboto-Regular.ttf",
        bold: "node_modules/pdfmake/fonts/Roboto-Medium.ttf",
      }
    };

    const printer = new PdfPrinter(fonts);

    const doctorNotes = scan.doctorReviewText || scan.notes || "No notes provided";

    let docDefinition = {
      pageMargins: [40, 60, 40, 60],

      content: [
        { text: "CT Scan Report", style: "header" },

        { text: `Patient: ${patient.name}`, style: "subheader" },
        { text: `MRN: ${patient.mrn || "N/A"}` },
        { text: `Scan Type: ${scan.scanType}` },
        { text: `Date: ${scan.createdAt.toISOString().slice(0,10)}` },
        { text: "\n" },

        { text: "Doctor's Notes:", style: "sectionTitle" },
        { text: doctorNotes, style: "paragraph" },

        { text: "\nOriginal CT Scan:", style: "sectionTitle" },
      ],

      styles: {
        header: { fontSize: 22, bold: true, alignment: "center", margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 5, 0, 5] },
        sectionTitle: { fontSize: 16, bold: true, margin: [0, 15, 0, 10] },
        paragraph: { fontSize: 12, margin: [0, 5, 0, 10] }
      }
    };

    // Include original scan image if exists
    if (scan.fileUrl) {
      const imgPath = path.join(__dirname, "..", scan.fileUrl);
      if (fs.existsSync(imgPath)) {
        docDefinition.content.push({
          image: imgPath,
          width: 400,
          margin: [0, 10, 0, 20]
        });
      }
    }

    // Add review images
    docDefinition.content.push({ text: "Review Images:", style: "sectionTitle" });

    if (scan.doctorReviewUrl) {
      const img2 = path.join(__dirname, "..", scan.doctorReviewUrl);
      if (fs.existsSync(img2)) {
        docDefinition.content.push({
          image: img2,
          width: 400,
          margin: [0, 10, 0, 20]
        });
      }
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=CT_Scan_Report_${patient.name}.pdf`);

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    logger.error(`[${endpoint}] Error generating PDF: ${err.stack}`);
    return res.status(500).json({ error: "PDF generation failed" });
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
