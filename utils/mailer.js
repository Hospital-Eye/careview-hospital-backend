const nodemailer = require("nodemailer");
const { logger } = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT), 
  secure: false, 
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error) => {
  if (error) {
    logger.error("[MAILER] SMTP configuration error", error);
  } else {
    logger.info("[MAILER] SMTP transporter ready");
  }
});

module.exports = { transporter };
