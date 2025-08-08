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

    router.get('/auth/google/callback', async (req, res) => {
        const { code } = req.query;

        try {
            const { data } = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            });

            const { access_token, id_token } = data;
            console.log('Bearer access token: ', access_token);

            const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            console.log('Token request payload:', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
            });


            // --- YOUR INTERNAL APPLICATION AUTHENTICATION AND AUTHORIZATION LOGIC ---
            let isLoginSuccessful = false;
            let appSpecificToken = null;

            try {
                const userEmail = profile.email;
                let user = await User.findOne({ email: userEmail });

                if (!user) {
                    if (!userEmail.endsWith('@sigmahealthsense.com')) {
                        user = new User({
                        googleId: profile.id, email: userEmail, name: profile.name,
                        profilePicture: profile.picture, role: 'patient', isActive: true
                    });
                    await user.save();
                    console.log(`New user registered and logged in: ${userEmail}`);
                    }
                    
                    user = new User({
                        googleId: profile.id, email: userEmail, name: profile.name,
                        profilePicture: profile.picture, role: 'nurse', isActive: true
                    });
                    await user.save();
                    console.log(`New user registered and logged in: ${userEmail}`);
                } else {
                    if (!user.isActive) {
                        console.warn(`Inactive user login attempt: ${userEmail}`);
                        return res.redirect(`${FRONTEND_BASE_URL}/login?error=account_inactive`);
                    }
                    user.googleId = profile.id; user.name = profile.name; user.profilePicture = profile.picture;
                    await user.save();
                    console.log(`Existing user logged in: ${userEmail}`);
                }

                const payload = { id: user._id, email: user.email, role: user.role };
                appSpecificToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }); // Use the passed JWT_SECRET
                isLoginSuccessful = true;

                console.log(`✅ Login success for ${user.email}. Redirecting with token: ${appSpecificToken}`);

            } catch (authError) {
                console.error('Internal authentication/authorization error:', authError);
                isLoginSuccessful = false;
                return res.redirect(`${FRONTEND_BASE_URL}/login?error=internal_auth_failed`);
            }

            if (isLoginSuccessful) {
                res.redirect(`${FRONTEND_BASE_URL}/dashboard?token=${appSpecificToken}`);
            } else {
                res.redirect(`${FRONTEND_BASE_URL}/login?error=auth_failed_general`);
            }

        } catch (error) {
            console.error('Error during Google OAuth process:', error.response ? error.response.data.error : error.message);
            res.redirect(`${FRONTEND_BASE_URL}/login?error=google_oauth_failed`);
        }
    });

    router.get('/logout', (req, res) => {
        res.redirect(`${FRONTEND_BASE_URL}/login`);
    });

    return router; // Return the router
};