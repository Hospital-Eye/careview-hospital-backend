const { Storage } = require("@google-cloud/storage");

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Upload file
const uploadBuffer = async (buffer, destination, mimetype) => {
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: {
      contentType: mimetype,
      cacheControl: "private, max-age=0",
    },
    gzip: true,
  });

  // return object path instead of public URL
  return destination;
};

// Generate signed URL
const getSignedUrl = async (filePath) => {
  const options = {
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  const [url] = await bucket.file(filePath).getSignedUrl(options);

  return url;
};

module.exports = { uploadBuffer, getSignedUrl };