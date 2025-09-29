const multer = require("multer");
const path = require("path");

// Configure disk storage for local dev
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/scans"); // folder where scans will be stored
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

module.exports = upload;
