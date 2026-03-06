const { Storage } = require("@google-cloud/storage");

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

const uploadBuffer = async (buffer, destination, mimetype) => {
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: {
      contentType: mimetype,
      cacheControl: "public, max-age=31536000",
    },
    gzip: true,
  });

  return `https://storage.googleapis.com/${bucketName}/${destination}`;
};

module.exports = { uploadBuffer };