const Scan = require("../models/Scan");
const path = require("path");
const fs = require("fs");

//GET all scans
const getScans = async (req, res) => {
  try {
    const filter = { ...req.scopeFilter };

    if (req.query.patientId) {
      filter.patientId = req.query.patientId;
    }

    const scans = await Scan.find(filter)
      .populate("patientId", "name mrn")
      .populate("uploadedBy", "name role");

    res.json(scans);
  } catch (err) {
    console.error("Error fetching scans:", err);
    res.status(500).json({ error: "Server error while fetching scans" });
  }
};

// CREATE a scan
const uploadScan = async (req, res) => {
  try {
    const { patientId, uploadedBy, notes } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No scan file uploaded" });
    }

    // Ensure uploads/scans exists
    const uploadDir = path.join(__dirname, "../uploads/scans");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move file from memory buffer to disk
    const filePath = path.join(uploadDir, req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);

    // Save metadata in DB
    const scan = new Scan({
      patientId,
      uploadedBy,
      organizationId: req.user.organizationId,   // 🔹 from logged-in user
      clinicId: req.user.clinicId,               // 🔹 from logged-in user
      fileUrl: `/uploads/scans/${req.file.originalname}`, // relative path
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