const express = require("express");
const multer = require("multer");
const { 
  getScans, 
  uploadScan, 
  getScanByMrn, 
  addDoctorReviewByMrn 
} = require("../controllers/scanController");

const { protect, authorize, scope } = require('../middleware/authMiddleware');
const path = require("path");

const router = express.Router();

/* ----------------------------------------------------
   MULTER CONFIG (Corrected to public/uploads/scans)
---------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads/scans"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ----------------------------------------------------
   STATIC SERVE (correct path)
   User will access scans at:   /uploads/scans/<filename>
---------------------------------------------------- */
router.use(
  "/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);

/* ----------------------------------------------------
   ROUTES
---------------------------------------------------- */

// GET all scans
router.get("/", 
  protect, 
  authorize("admin", "manager", "doctor"), 
  scope("Scan"), 
  getScans
);

// Upload scan — field name must match frontend’s FormData key
router.post(
  "/upload",
  protect,
  authorize("admin", "manager", "doctor"),
  scope("Scan"),
  upload.single("scan"), // IMPORTANT: this must match frontend key
  uploadScan
);

// get scan info by MRN
router.get("/:mrn",
  protect,
  authorize("admin", "manager", "doctor"),
  scope("Scan"),
  getScanByMrn
);

// add doctor review notes
router.put("/:mrn",
  protect,
  authorize("doctor"),
  scope("Scan"),
  addDoctorReviewByMrn
);

module.exports = router;
