const express = require("express");
const multer = require("multer");
const { getScans, uploadScan, getScanByMrn, addDoctorReviewByMrn } = require("../controllers/scanController");

const { protect, authorize, scope, patientCheck } = require('../middleware/authMiddleware');
const path = require("path");

const router = express.Router();

//Configure Multer for scan uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/scans"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

//GET all scans
router.get("/", protect, async (req, res, next) => {
const allowedRoles = ["admin", "manager", "doctor", 'nurse'];

// If user is a patient → restrict to their own scans
if (req.user.role === "patient") {
  const { Patient } = require("../models");

  // find which patient record belongs to this user
  const patient = await Patient.findOne({
    where: { userId: req.user.id }
  });

  if (!patient) {
    return res.status(404).json({
      error: "Patient record not found for this user."
    });
  }

  // Inject filter into req.query so controller only returns their scans
  req.query.patientId = patient.id;   // or req.query.mrn = patient.mrn

  return getScans(req, res);
}

// For medical staff, keep access but apply original authorization middleware
return authorize(...allowedRoles)(req, res, next);

}, scope("Scan"), getScans);


//Upload scan
router.post("/upload", protect, authorize("admin", "manager", "doctor", 'nurse'), scope("Scan"), upload.single("scan"), uploadScan);

router.get("/:mrn", protect, patientCheck, authorize("admin", "manager", "doctor", "nurse"), scope("Scan"), getScanByMrn);

//Add doctor review notes
router.put("/:mrn", protect, authorize("doctor"), scope("Scan"), addDoctorReviewByMrn);

module.exports = router;
