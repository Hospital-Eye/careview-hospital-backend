const express = require("express");

module.exports = ({ transporter }) => {
  const router = express.Router();
  const callLogController = require("../controllers/callLogController")({
    transporter,
  });

  //Webhook
  router.post("/retell/webhook", callLogController.retellWebhook);

  //Read APIs
  router.get("/call-transcripts", callLogController.getAllCallTranscripts);
  router.get("/call-transcripts/:callId",callLogController.getCallTranscriptByCallId);

  return router;
};
