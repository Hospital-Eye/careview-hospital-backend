const { Scan, Patient, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const path = require("path");
const { logger } = require('../utils/logger');
const PdfPrinter = require("pdfmake");
const { uploadBuffer, getSignedUrl } = require("../utils/gcs");
const multer = require("multer");
const fs = require("fs");
const dicomParser = require("dicom-parser");


// Use memory storage so we get req.file.buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

//GET all scans
const getScans = async (req, res, next) => {
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
    const scansWithSignedUrls = await Promise.all(
    scans.map(async (scan) => {
      const scanObj = scan.toJSON();

      if (scanObj.fileUrl) {
        scanObj.fileUrl = await getSignedUrl(scanObj.fileUrl);
      }

      return scanObj;
    })
  );

  res.status(200).json(scansWithSignedUrls);

  } catch (err) {
    logger.error(`[${endpoint}] Error in getScans: ${err.stack}`);
    return next(err);
  }
};

//Upload a Scan
const uploadScan = async (req, res, next) => {
  const endpoint = 'uploadScan';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to upload a new scan from user: ${userEmail}`);

  try {
    // 1️⃣ Check that a file was uploaded
    if (!req.file) {
      logger.warn(`[${endpoint}] No file uploaded`);
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    logger.debug(`[${endpoint}] Upload request body: ${JSON.stringify({ patientName, mrn, scanType, urgencyLevel })}`);
    logger.debug(`[${endpoint}] Uploader info: ${JSON.stringify({ id: req.user?.id, email: req.user?.email, role: req.user?.role })}`);
    logger.debug(`[${endpoint}] req.file: ${JSON.stringify({ originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size })}`);

    // 2️⃣ Find patient
    const patient = await Patient.findOne({ where: { name: patientName, mrn } });
    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for name="${patientName}" and MRN="${mrn}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    // 3️⃣ Determine file extension
    const ext = path.extname(req.file.originalname).toLowerCase();

    // 4️⃣ DICOM validation (if .dcm)
    if (ext === '.dcm') {
      try {
        dicomParser.parseDicom(req.file.buffer);
      } catch (err) {
        logger.warn(`[${endpoint}] Invalid DICOM file uploaded`);
        return res.status(400).json({ error: "Invalid DICOM file" });
      }
    }

    // 5️⃣ GCS path & MIME type
    const gcsPath = `reports/${patient.id}/scan_${Date.now()}${ext}`;
    const mimeType = ext === '.dcm' ? 'application/dicom' : req.file.mimetype;

    // 6️⃣ Upload to GCS
    const fileUrl = await uploadBuffer(req.file.buffer, gcsPath, mimeType);

    // 7️⃣ Optional: save a local copy in dev
    if (process.env.NODE_ENV === 'development') {
      const localUploadPath = path.join(__dirname, "../uploads/scans");
      if (!fs.existsSync(localUploadPath)) fs.mkdirSync(localUploadPath, { recursive: true });
      fs.writeFileSync(path.join(localUploadPath, req.file.originalname), req.file.buffer);
    }

    // 8️⃣ Save scan record in DB
    const scan = await Scan.create({
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      patientId: patient.id,
      mrn: patient.mrn,
      uploadedBy: req.user.id,
      scanType,
      urgencyLevel,
      fileUrl,
      notes,
    });

    logger.info(`[${endpoint}] Scan uploaded successfully by ${userEmail} for patient MRN=${mrn}`);
    return res.status(201).json(scan);

  } catch (err) {
    logger.error(`[${endpoint}] Error in uploadScan: ${err?.message}`);
    logger.error(`[${endpoint}] Full Error: ${JSON.stringify(err, null, 2)}`);
    logger.error(err);
    return next(err);
  }
};


// GET all scans by patientId
const getScansByPatientId = async (req, res, next) => {
  const endpoint = "getScansByPatientId";
  const userEmail = req.user?.email || "unknown";
  const patientId = req.params.patientId;

  logger.info(
    `[${endpoint}] Request to view scans of patientId=${patientId} received from user: ${userEmail}`
  );

  let scans;

  try {
    // Find the patient by ID
    const patient = await Patient.findOne({ where: { id: patientId } });

    if (!patient) {
      logger.warn(`[${endpoint}] Patient not found for patientId="${patientId}"`);
      return res.status(404).json({ error: "Patient not found" });
    }

    // Fetch ALL scans for this patient
    try {
      scans = await Scan.findAll({
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
    } catch (error) {
      logger.error(`[${endpoint}] Scan query failed`, {
        message: error.message,
        original: error.original,
        sql: error.sql
      });
      throw error;
    }

    if (!scans.length) {
      logger.info(`[${endpoint}] No scans found for patientId=${patient.id}`);
      return res.status(200).json([]);
    }

    logger.info(
      `[${endpoint}] Found ${scans.length} scans for patientId=${patientId}`
    );

    // Build response objects for each scan
    const scanResponses = scans.map((scan) => {
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
        fileUrl: scan.fileUrl
      };

    });

    return res.status(200).json(scanResponses);

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return next(err);
  }
};


// save AI analysis results by Scan ID
const saveAIAnalysis = async (req, res) => {
  const { scanId } = req.params;
  const { aiAnalysis } = req.body;

  const scan = await Scan.findByPk(scanId);

  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  await scan.update({
    aiAnalysis,
    aiReportGeneratedAt: new Date()
  });

  return res.json({ success: true });
};

//Add Doctor Review by Scan ID (preferred)
const addDoctorReviewByScanId = async (req, res, next) => {
  const endpoint = "addDoctorReviewByScanId";
  const userEmail = req.user?.email || "unknown";

  logger.info(`[${endpoint}] Incoming request from: ${userEmail}`);

  try {
    const { scanId } = req.params;
    const { notes } = req.body;

    logger.debug(`[${endpoint}] req.body: ${JSON.stringify(req.body)}`);


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
      const gcsPath = `reviews/${Date.now()}_${req.file.originalname}`;

      const imageUrl = await uploadBuffer(
        req.file.buffer,
        gcsPath,
        req.file.mimetype
      );

      updateFields.doctorReviewUrl = imageUrl;

      logger.info(`[${endpoint}] Doctor review image uploaded to GCS: ${imageUrl}`);
    }

    await scan.update(updateFields);

    logger.info(`[${endpoint}] Doctor review saved for scanId=${scan.id}`);

    return res.status(200).json({
      message: "Doctor review saved",
      scan,
    });

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return next(err);
  }
};

//generate pdf
const generateReport = async (req, res, next) => {
  const endpoint = "generateReport";
  const { scanId } = req.params;
  const userEmail = req.user?.email || "unknown";

  logger.info(
    `[${endpoint}] Request to generate PDF for scanId=${scanId} by user=${userEmail}`
  );

  try {
    // 1️⃣ Fetch scan + patient
    const scan = await Scan.findOne({
      where: { id: scanId },
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["name", "mrn", "dob", "gender"],
        },
      ],
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    if (!scan.patient) {
      return res.status(404).json({
        error: "Patient not found for this scan",
      });
    }

    // 2️⃣ Fonts
    const fonts = {
      Roboto: {
        normal: path.join(
          __dirname,
          "../fonts/Roboto-VariableFont_wdth,wght.ttf"
        ),
      },
    };

    const printer = new PdfPrinter(fonts);

    // 3️⃣ Parse AI analysis safely
    const ai = scan.aiAnalysis || {};

    // 4️⃣ Load scan image if exists
    let scanImageBlock = [];
    if (scan.fileUrl) {
      try {
        let scanImageBlock = [];

        if (scan.fileUrl) {
          scanImageBlock = [
            { text: "Original Scan Image", style: "sectionHeader" },
            {
              text: scan.fileUrl,
              link: scan.fileUrl,
              color: "blue",
              margin: [0, 10, 0, 10],
            },
          ];
        }
      } catch (err) {
        logger.warn(
          `[${endpoint}] Failed loading scan image: ${err.message}`
        );
      }
    }

    // 5️⃣ Build AI analysis block
    const aiBlock = [
      { text: "AI Analysis", style: "sectionHeader" },
      {
        text:
          typeof ai === "string"
            ? ai
            : JSON.stringify(ai, null, 2),
        margin: [0, 5, 0, 10],
      },
    ];

    // 6️⃣ PDF Definition
    const docDefinition = {
      content: [
        { text: "Patient Scan Report", style: "header" },

        { text: "Patient Details", style: "sectionHeader" },
        { text: `Name: ${scan.patient.name}` },
        { text: `MRN: ${scan.patient.mrn}` },
        { text: `DOB: ${scan.patient.dob || "-"}` },
        { text: `Gender: ${scan.patient.gender || "-"}` },
        { text: `Scan Type: ${scan.scanType}` },
        { text: `Urgency Level: ${scan.urgencyLevel}` },
        { text: `Status: ${scan.status}` },

        ...scanImageBlock,

        ...aiBlock,

        { text: "Doctor's Notes", style: "sectionHeader" },
        { text: scan.notes || "-" },

        {
          text: `Generated By: ${userEmail}`,
          margin: [0, 20, 0, 0],
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          margin: [0, 0, 0, 10],
        },
        sectionHeader: {
          fontSize: 14,
          margin: [0, 15, 0, 5],
        },
      },

      defaultStyle: {
        font: "Roboto",
      },
    };

    // 7️⃣ Create PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    pdfDoc.on("data", (chunk) => chunks.push(chunk));

    pdfDoc.on("end", async () => {
      try {
        const result = Buffer.concat(chunks);

        // GCS upload path
        const gcsPath = `reports/scan_${scanId}.pdf`;

        const filePath = await uploadBuffer(
          result,
          gcsPath,
          "application/pdf"
        );

        scan.finalReportUrl = filePath;
        scan.status = "Reviewed";
        await scan.save();

        // generate signed URL
        const signedUrl = await getSignedUrl(filePath);

        return res.status(200).json({
          success: true,
          reportUrl: signedUrl,
        });

      } catch (err) {
        logger.error(`[${endpoint}] Failed uploading PDF`, err);
        return next(err);
      }
    });

    pdfDoc.end();

  } catch (err) {
    logger.error(`[${endpoint}] Error generating PDF`, err);
    return next(err);
  }
};

const getFinalReportByScanId = async (req, res, next) => {
  const endpoint = "getFinalReportByScanId";

  try {
    const { scanId } = req.params;

    logger.info(`[${endpoint}] Fetching review/report for scanId: ${scanId}`);

    const scan = await Scan.findOne({
      where: { id: scanId },
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "name", "email"],
        },
        {
          model: Patient,
          as: "patient",
          attributes: ["id", "name", "mrn", "dob", "gender"],
        },
      ],
    });

    if (!scan) {
      logger.warn(`[${endpoint}] No scan found for scanId: ${scanId}`);
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    let signedReportUrl = null;

    if (scan.finalReportUrl) {
      signedReportUrl = await getSignedUrl(scan.finalReportUrl);
    }

    return res.status(200).json({
      success: true,
      review: {
        id: scan.id,
        patientId: scan.patientId,
        mrn: scan.patient?.mrn || null,
        uploadedBy: scan.uploader?.name || null,
        uploader: scan.uploader || null,
        scanType: scan.scanType,
        urgencyLevel: scan.urgencyLevel,
        status: scan.status,
        notes: scan.notes,
        aiAnalysis: scan.aiAnalysis,
        reportUrl: signedReportUrl,
        patient: scan.patient,
        createdAt: scan.createdAt,
      },
    });

  } catch (error) {
    logger.error(`[${endpoint}] Error: ${error.message}`);
    return next(error);
  }
};


// GET all final reports for a patient
const getFinalReportsByPatientId = async (req, res, next) => {
  const endpoint = "getFinalReportsByPatientId";
  const userEmail = req.user?.email || "unknown";
  const { patientId } = req.params;

  logger.info(
    `[${endpoint}] Request to fetch final reports for patientId=${patientId} from user=${userEmail}`
  );

  try {
    const scans = await Scan.findAll({
      where: {
        patientId,
        finalReportUrl: {
          [Op.ne]: null,
        },
      },
      attributes: [
        "id",
        "scanType",
        "urgencyLevel",
        "status",
        "finalReportUrl",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    logger.info(
      `[${endpoint}] Found ${scans.length} final reports for patientId=${patientId}`
    );

    const reportsWithSignedUrls = await Promise.all(
      scans.map(async (scan) => {
        const scanObj = scan.toJSON();

        if (scanObj.finalReportUrl) {
          scanObj.finalReportUrl = await getSignedUrl(scanObj.finalReportUrl);
        }

        return scanObj;
      })
    );

    return res.status(200).json({
      message: "Final reports fetched successfully",
      reports: reportsWithSignedUrls,
    });

  } catch (err) {
    logger.error(`[${endpoint}] Error: ${err.stack}`);
    return next(err);
  }
};




module.exports = { 
  getScans, 
  uploadScan, 
  getScansByPatientId, 
  saveAIAnalysis,
  addDoctorReviewByScanId, 
  generateReport, 
  getFinalReportByScanId,
  getFinalReportsByPatientId
};
