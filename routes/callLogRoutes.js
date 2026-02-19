const express = require("express");

module.exports = ({ transporter }) => {
  const router = express.Router();

  const callLogController = require("../controllers/callLogController");


  //Webhook 
  router.post("/webhook", callLogController.retellWebhook);

  //Read APIs
  router.get("/call-transcripts", callLogController.getAllCallTranscripts);
  router.get(
    "/call-transcripts/:callId",
    callLogController.getCallTranscriptByCallId
  );

  router.use((req, res) => {
    res.status(404).json({ error: "Retell route not found" });
  });

  return router;
};
