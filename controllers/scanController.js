const Scan = require("../models/Scan");
const Patient = require("../models/Patient");
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

    const scans = await Scan.find(filter)
      .populate("patientId", "name mrn email")   // show patient details
      .populate("uploadedBy", "name role email")      // show staff details
      .sort({ createdAt: -1 });                       // newest first

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

    // 1️⃣ Find patient using patientName + MRN
    const patient = await Patient.findOne({ name: patientName, mrn });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // 2️⃣ Check if a scan already exists for this patient + MRN
    const existingScan = await Scan.findOne({
      patientId: patient._id,
      mrn: patient.mrn,
    });

    if (existingScan) {
      return res.status(400).json({ error: "Patient scan record already exists" });
    }

    // 3️⃣ Create scan
    const scan = new Scan({
      organizationId: patient.organizationId,
      clinicId: patient.clinicId,
      patientId: patient._id,
      mrn: patient.mrn,
      uploadedBy: req.user._id,
      scanType,
      urgencyLevel,
      fileUrl: `/uploads/scans/${req.file.filename}`, // local path
      notes,
    });

    await scan.save();
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

    const patient = await Patient.findOne({ mrn });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // fetch latest scan for this patient
    const scan = await Scan.findOne({ patientId: patient._id })
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

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
      _id: scan._id,
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

    const patient = await Patient.findOne({ mrn });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // pick scan
    let scan;
    if (scanId) {
      scan = await Scan.findOne({ _id: scanId, patientId: patient._id });
    } else {
      scan = await Scan.findOne({ patientId: patient._id }).sort({ createdAt: -1 }); // latest scan
    }

    if (!scan) return res.status(404).json({ error: "Scan not found" });

    scan.notes = notes || scan.notes;
    scan.status = "Reviewed";
    await scan.save();

    res.status(200).json({ message: "Doctor review saved", scan });
  } catch (err) {
    console.error("Error adding doctor review:", err);
    res.status(500).json({ error: "Server error while saving review" });
  }
};


module.exports = { getScans, uploadScan, getScanByMrn, addDoctorReviewByMrn };