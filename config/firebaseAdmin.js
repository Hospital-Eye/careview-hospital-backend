const admin = require('firebase-admin');
const path = require('path');

// Use service account for local development
let serviceAccount;

if (process.env.NODE_ENV !== 'production') {
  serviceAccount = require(path.resolve(__dirname, './serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized using service account (local)');
} else {
  // Use default credentials (e.g., in Google Cloud Run or GCP-hosted backend)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('✅ Firebase Admin initialized using default credentials (production)');
}

module.exports = admin;
