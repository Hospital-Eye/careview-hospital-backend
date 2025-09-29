const express = require("express");
const multer = require("multer");
const { getScans, uploadScan, getScanByMrn, addDoctorReviewByMrn } = require("../controllers/scanController");
const { protect, authorize, scope } = require('../middleware/authMiddleware');
const path = require("path");

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads/scans/")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Serve uploads statically (make sure this is also in server.js)
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// GET all scans (optionally filter by patientId)
router.get("/", protect, authorize("admin", "manager", "doctor"), scope("Scan"), getScans);

// Upload new scan
router.post("/upload", protect, authorize("admin", "manager", "doctor"), scope("Scan"), upload.single("scan"), uploadScan);

// get scan info per patient
router.get("/:mrn", protect, authorize("admin", "manager", "doctor"), scope("Scan"), getScanByMrn);

// add doctor review notes
router.put("/:mrn", protect, authorize("doctor"), scope("Scan"), addDoctorReviewByMrn);



module.exports = router;
