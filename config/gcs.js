const { Storage } = require('@google-cloud/storage');

// Uses GOOGLE_APPLICATION_CREDENTIALS from env (JSON key or Workload Identity on Cloud Run)
const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME; 
const bucket = storage.bucket(bucketName);

module.exports = { storage, bucket };
