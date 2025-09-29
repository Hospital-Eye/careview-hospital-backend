const express = require("express");
const multer = require("multer");
const { getScans, uploadScan } = require("../controllers/scanController");
const { protect, authorize, scope } = require('../middleware/authMiddleware');

const router = express.Router();

// configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/scans/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// GET all scans (optionally filter by patientId)
router.get("/", protect, authorize("manager", "doctor"), scope("Scan"), getScans);

// Upload new scan
router.post("/", protect, authorize("manager", "doctor"), scope("Scan"), upload.single("scanFile"), uploadScan);

module.exports = router;
