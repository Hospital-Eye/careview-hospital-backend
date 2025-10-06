const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
require('dotenv').config();

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
        let user = await User.findOne({ email: userEmail });

        if (!user) {
        user = new User({
            googleId: profile.id,
            email: userEmail,
            name: profile.name,
            profilePicture: profile.picture,
            role,
            organizationId: "sigma-healthsense",
            clinicId: "newhope-1",
            isActive: true,
        });
        await user.save();
        console.log(`🆕 New ${role} registered: ${userEmail}`);
        } else {
        if (!user.isActive) {
            return res.redirect(`${FRONTEND_BASE_URL}/login?error=account_inactive`);
        }
        user.googleId = profile.id;
        user.name = profile.name;
        user.profilePicture = profile.picture;
        await user.save();
        console.log(`✅ Existing ${role} logged in: ${userEmail}`);
        }

        // --- JWT ---
        const payload = {
        id: user._id,
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
        return res.redirect(`${FRONTEND_BASE_URL}/login?error=google_oauth_failed`);
    }
    });

        
    router.get('/logout', (req, res) => {
        res.redirect(`${FRONTEND_BASE_URL}/login`);
    });

    return router; // Return the router
};