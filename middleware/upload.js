const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { logger } = require('../utils/logger');

const uploadPath = path.join(__dirname, "../uploads/scans");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Allow JPG, PNG, and DICOM
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.dcm'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    logger.warn(`Rejected file upload: ${file.originalname}`);
    cb(new Error('Only JPG, PNG, and DICOM (.dcm) files are allowed'), false);
  }
};

// Use memory storage for consistency
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

module.exports = upload;