const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require('dotenv').config();

module.exports = (
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_BASE_URL
) => {
  const router = express.Router();

  //SMTP transport for OTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  //generate OTP
  const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  //login by Google
  router.get("/auth/google", (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email`;
    res.redirect(url);
  });

  const ALLOWED_DOMAINS = ["sigmahealthsense.com", "usc.edu"];

  router.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;

    try {
      const { data } = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code"
      });

      const { access_token } = data;

      const { data: profile } = await axios.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const userEmail = profile.email.toLowerCase();
      const domain = userEmail.split("@")[1];

      let role = ALLOWED_DOMAINS.includes(domain) ? "nurse" : "patient";

      let user = await User.findOne({ where: { email: userEmail } });

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: userEmail,
          name: profile.name,
          profilePicture: profile.picture,
          role,
          organizationId: "sigma-healthsense",
          clinicId: "newhope-1",
          isActive: true
        });
      } else {
        if (!user.isActive) {
          return res.redirect(
            `${FRONTEND_BASE_URL}/login?error=account_inactive`
          );
        }
        await user.update({
          googleId: profile.id,
          name: profile.name,
          profilePicture: profile.picture
        });
      }

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        clinicId: user.clinicId
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "24h"
      });

      return res.redirect(`${FRONTEND_BASE_URL}/dashboard?token=${token}`);
    } catch (err) {
      console.error("Google OAuth error:", err);
      return res.redirect(
        `${FRONTEND_BASE_URL}/login?error=google_oauth_failed`
      );
    }
  });

  //signup (email + password)
    router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password || !name) {
        return res.status(400).json({ error: "Name, email, and password required" });
        }

        let user = await User.findOne({ where: { email } });

        if (user && user.password) {
        return res.status(400).json({ error: "Account already exists. Please log in." });
        }

        const hashed = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (!user) {
        //create new inactive account
        user = await User.create({
            name,
            email,
            password: hashed,
            otp,
            otpExpiresAt: expiresAt,
            isActive: false,       //activate only after OTP verify
            role: "patient",       //default if email signup
            organizationId: "sigma-healthsense",
            clinicId: "newhope-1"
        });
        } else {

        await user.update({
            name,
            password: hashed,
            otp,
            otpExpiresAt: expiresAt,
            isActive: false
        });
        }

        //send OTP email
        await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Verify your account - OTP",
        html: `<h2>${otp}</h2><p>Your OTP expires in 10 minutes.</p>`
        });

        res.json({ message: "Signup successful. OTP sent to email." });

    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Signup failed" });
    }
    });


  //send OTP
  router.post("/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      let user = await User.findOne({ where: { email } });

      if (!user) {
        user = await User.create({
          email,
          otp,
          otpExpiresAt: expiresAt
        });
      } else {
        await user.update({ otp, otpExpiresAt: expiresAt });
      }

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Your OTP Code",
        html: `<h2>${otp}</h2><p>Expires in 10 minutes.</p>`
      });

      res.json({ message: "OTP sent" });
    } catch (err) {
      console.error("OTP error:", err);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  //verify OTP
  router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date() > user.otpExpiresAt)
      return res.status(400).json({ error: "OTP expired" });

    await user.update({
      otp: null,
      otpExpiresAt: null,
      isActive: true
    });

    res.json({ message: "OTP verified. Account activated." });

  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});


  //set Password
  router.post("/set-password", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const hashed = await bcrypt.hash(password, 10);
      await user.update({
        password: hashed,
        otp: null,
        otpExpiresAt: null
      });

      res.json({ message: "Password set successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  //login (email + password)
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: "Wrong password" });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ message: "Login successful", token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  //logout
  router.get("/logout", (req, res) => {
    res.redirect(`${FRONTEND_BASE_URL}/login`);
  });

  return router;
};







/*
//This function will be called by server.js, passing the variables
module.exports = (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_BASE_URL) => {
    const router = express.Router();

    router.get('/auth/google', (req, res) => {
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email`;
        console.log('Redirecting to Google with REDIRECT_URI:', GOOGLE_REDIRECT_URI);
        res.redirect(url);
    });

    // 📝 Allowed staff domains (from env/config ideally)
    const ALLOWED_DOMAINS = [
    "sigmahealthsense.com",
    "usc.edu"
    ];

    router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // --- Token exchange ---
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
        });

        const { access_token } = data;

        // --- Fetch Google profile ---
        const { data: profile } = await axios.get(
        'https://www.googleapis.com/oauth2/v1/userinfo',
        { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const userEmail = profile.email.toLowerCase();
        const domain = userEmail.split("@")[1]; // take everything after @
        let role;

        // --- Role assignment ---
        if (ALLOWED_DOMAINS.includes(domain)) {
        role = "nurse";
        }
        else if (!ALLOWED_DOMAINS.includes(domain)){
        role = "patient";
        } else {
        console.warn(`❌ Unauthorized domain attempted login: ${userEmail}`);
        return res.redirect(`${FRONTEND_BASE_URL}/login?error=unauthorized_domain`);
        }

        // --- Find or create user ---
        let user = await User.findOne({ where: { email: userEmail } });

        if (!user) {
        user = await User.create({
            googleId: profile.id,
            email: userEmail,
            name: profile.name,
            profilePicture: profile.picture,
            role,
            organizationId: "sigma-healthsense",
            clinicId: "newhope-1",
            isActive: true,
        });
        console.log(`🆕 New ${role} registered: ${userEmail}`);
        } else {
        if (!user.isActive) {
            return res.redirect(`${FRONTEND_BASE_URL}/login?error=account_inactive`);
        }
        await user.update({
            googleId: profile.id,
            name: profile.name,
            profilePicture: profile.picture
        });
        console.log(`✅ Existing ${role} logged in: ${userEmail}`);
        }

        // --- JWT ---
        const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        clinicId: user.clinicId || null,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

        console.log(`✅ Login successful with email: ${userEmail}`);
        return res.redirect(`${FRONTEND_BASE_URL}/dashboard?token=${token}`);

    } catch (err) {
        console.error("Google OAuth error:", err.message);
        console.error("Full error:", err);
        return res.redirect(`${FRONTEND_BASE_URL}/login?error=google_oauth_failed`);
    }
    });


    router.get('/logout', (req, res) => {
        res.redirect(`${FRONTEND_BASE_URL}/login`);
    });

    return router; // Return the router
};
*/