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


router.use(
  "/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);


//GET all scans
router.get("/", protect, authorize("admin", "manager", "doctor"), scope("Scan"), getScans);

//Upload scan
router.post("/upload", protect, authorize("admin", "manager", "doctor"), scope("Scan"), upload.single("scan"), uploadScan);

//Get scan info by MRN
router.get("/:mrn", protect, authorize("admin", "manager", "doctor"), scope("Scan"), getScanByMrn);

//Add doctor review notes
router.put("/:mrn", protect, authorize("doctor"), scope("Scan"), addDoctorReviewByMrn);

module.exports = router;
