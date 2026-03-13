const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendOnboardingEmail = async (to, workEmail, token) => {
  const setupLink = `${process.env.FRONTEND_BASE_URL}/activate-account?token=${token}`;

  await transporter.sendMail({
    from: `"New Hope" <no-reply@newhope1.com>`,
    to,
    subject: "Set up your New Hope account",
    html: `
      <p>Your staff account has been created.</p>
      <p><strong>Work Email:</strong> ${workEmail}</p>
      <p>Click below to set your password:</p>
      <a href="${setupLink}">${setupLink}</a>
      <p>This link expires in 24 hours.</p>
    `
  });
};

module.exports = { sendOnboardingEmail };