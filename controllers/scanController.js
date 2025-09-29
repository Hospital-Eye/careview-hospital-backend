const Scan = require("../models/Scan");
const Patient = require("../models/Patient");
const path = require("path");
const fs = require("fs");

//GET all scans
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


const uploadScan = async (req, res) => {
  try {
    const { patientName, mrn, scanType, urgencyLevel, notes } = req.body;

    // 1️⃣ Validate file
    if (!req.file) {
      return res.status(400).json({ error: "No scan file uploaded" });
    }

    // 2️⃣ Find patient by name + MRN
    const patient = await Patient.findOne({
      name: patientName,
      mrn: mrn
    });

    if (!patient) {
      return res.status(400).json({ error: "Patient with this name + MRN does not exist" });
    }

    // 3️⃣ Create Scan document
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

    const savedScan = await scan.save();
    res.status(201).json(savedScan);

  } catch (err) {
    console.error("Error uploading scan:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = { getScans, uploadScan };