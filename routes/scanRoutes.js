const express = require("express");
const multer = require("multer");
const { getScans, uploadScan, getScansByPatientId, addDoctorReviewByPatientId, getDoctorReviewByPatientId } = require("../controllers/scanController");

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

//If user is a patient → restrict to their own scans
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

  //Inject filter into req.query so controller only returns their scans
  req.query.patientId = patient.id;   

  return getScans(req, res);
}

// For medical staff, keep access but apply original authorization middleware
return authorize(...allowedRoles)(req, res, next);

}, scope("Scan"), getScans);


//Upload scan
router.post("/upload", protect, patientCheck, authorize("admin", "manager", "doctor", 'nurse'), scope("Scan"), upload.single("scan"), uploadScan);

//View scans of a particular patient
router.get("/:patientId", protect, patientCheck, authorize("admin", "manager", "doctor", "nurse"), scope("Scan"), getScansByPatientId);


// Multer storage for doctor review image uploads
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/doctorReviews"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadReviewImage = multer({ storage: reviewStorage });


//Add doctor review notes (+images if any)
router.put("/:patientId", protect, authorize("doctor"), scope("Scan"), uploadReviewImage.single("doctorImage"),addDoctorReviewByPatientId);

//View doctor's notes for scans of a patientId
router.get("/:patientId", protect, patientCheck, authorize("doctor"), scope("Scan"), getDoctorReviewByPatientId);


module.exports = router;
