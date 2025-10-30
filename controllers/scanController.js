const { Scan, Patient, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const path = require("path");
const fs = require("fs");

// --- GET all scans ---
const getScans = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };

    // Allow filtering by patientId or MRN
    if (req.query.patientId) {
      filter.patientId = req.query.patientId;
    }
    if (req.query.mrn) {
      filter.mrn = req.query.mrn;
    }

    const scans = await Scan.findAll({
      where: filter,
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'mrn', 'emailId'] },
        { model: User, as: 'uploader', attributes: ['name', 'role', 'email'] }
      ],
      order: [['createdAt', 'DESC']] // newest first
    });

    res.status(200).json(scans);
  } catch (err) {
    console.error("Error fetching scans:", err);
    res.status(500).json({ error: "Server error while fetching scans" });
  }
};

// --- Upload a new Scan ---
const uploadScan = async (req, res) => {
  try {
    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    console.log("Uploader inside uploadScan:", req.user);

    // 1️⃣ Find patient using patientName + MRN
    const patient = await Patient.findOne({ where: { name: patientName, mrn } });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // 3️⃣ Create scan
    const scan = await Scan.create({
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      patientId: patient.id,
      mrn: patient.mrn,
      uploadedBy: req.user.id,
      scanType,
      urgencyLevel,
      fileUrl: `/uploads/scans/${req.file.filename}`, // local path
      notes,
    });

    res.status(201).json(scan);

  } catch (err) {
    console.error("Error uploading scan:", err);
    res.status(500).json({ error: "Server error while uploading scan" });
  }
};

// --- GET scans by MRN (metadata + image file content) ---
const getScanByMrn = async (req, res) => {
  try {
    const { mrn } = req.params;

    const patient = await Patient.findOne({ where: { mrn } });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // fetch latest scan for this patient
    const scan = await Scan.findOne({
      where: { patientId: patient.id },
      include: [{ model: Patient, as: 'uploadedBy', attributes: ['name', 'role'] }],
      order: [['createdAt', 'DESC']]
    });

    if (!scan) {
      return res.status(404).json({ error: "No scans found for this MRN" });
    }

    // absolute file path
    const filePath = path.join(__dirname, "..", scan.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Scan file not found" });
    }

    // send metadata + file
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
      // file as base64 string so frontend can display it
      file: {
        mimetype: scan.fileType || "image/jpeg",
        data: fs.readFileSync(filePath, { encoding: "base64" })
      }
    });
  } catch (err) {
    console.error("Error fetching scans by MRN:", err);
    res.status(500).json({ error: "Server error while fetching scan" });
  }
};

// --- Add Doctor Review by MRN ---
const addDoctorReviewByMrn = async (req, res) => {
  try {
    const { mrn } = req.params;
    const { notes, scanId } = req.body; // optional: specify exact scan

    const patient = await Patient.findOne({ where: { mrn } });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // pick scan
    let scan;
    if (scanId) {
      scan = await Scan.findOne({ where: { id: scanId, patientId: patient.id } });
    } else {
      scan = await Scan.findOne({
        where: { patientId: patient.id },
        order: [['createdAt', 'DESC']]
      }); // latest scan
    }

    if (!scan) return res.status(404).json({ error: "Scan not found" });

    await scan.update({
      notes: notes || scan.notes,
      status: "Reviewed"
    });

    res.status(200).json({ message: "Doctor review saved", scan });
  } catch (err) {
    console.error("Error adding doctor review:", err);
    res.status(500).json({ error: "Server error while saving review" });
  }
};


module.exports = { getScans, uploadScan, getScanByMrn, addDoctorReviewByMrn };
