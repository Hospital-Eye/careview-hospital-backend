const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

if (process.env.NODE_ENV !== 'production') {
  serviceAccount = require(path.resolve(__dirname, './serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin initialized using service account (local)');
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  logger.info('Firebase Admin initialized using default credentials (production)');
}


module.exports = admin;
