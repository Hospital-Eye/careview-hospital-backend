const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { CallLog, User, Patient } = require("../models");
const { logger } = require("../utils/logger");
const finalizeVoiceCallService = require("../services/finalizeVoiceCallService");

async function processRetellWebhook(body) {
  const event = body?.event;
  const call = body?.call;
  if (!call) return;

  const callId = call.call_id;
  const dynamic = call.retell_llm_dynamic_variables || {};

  const name = dynamic.customer_name?.trim() || null;
  const dob = dynamic.dob || null;
  const email = dynamic.email?.toLowerCase()?.trim() || null;
  const phone = call.from_number || null;

  const existingCall = await CallLog.findOne({
  where: { callId }
  });

  if (existingCall) {
    await existingCall.update({
      agentId: call.agent_id,
      organizationId: "sigma-healthsense",
      clinicId: "newhope-1",
      name,
      phone,
      transcript: existingCall.transcript || null,
      attendeeEmail: email,
      callStatus: call.call_status,
      startTimestamp: call.start_timestamp,
      endTimestamp: call.end_timestamp,
      durationSeconds: call.duration_seconds,
      disconnectionReason: call.disconnection_reason
    });
  } else {
    await CallLog.create({
      callId,
      agentId: call.agent_id,
      organizationId: "sigma-healthsense",
      clinicId: "newhope-1",
      name,
      phone,
      transcript: call.transcript || null,
      attendeeEmail: email,
      callStatus: call.call_status,
      startTimestamp: call.start_timestamp,
      endTimestamp: call.end_timestamp,
      durationSeconds: call.duration_seconds,
      disconnectionReason: call.disconnection_reason
    });
  }


  if (event === "call_analyzed" && email) {
    const existing = await CallLog.findOne({ where: { callId } });

    if (existing?.finalized) {
      return;
    }

    const result = await finalizeVoiceCallService({
      email,
      phone,
      name,
      dob,
      organizationId: "sigma-healthsense",
      clinicId: "newhope-1"
    });

    await CallLog.update(
      {
        transcript: args.transcript,
        userId: result.userId,
        patientId: result.patientId,
        finalized: true
      },
      { where: { callId } }
    );
  }
}

const retellWebhook = async (req, res) => {
  console.log("received webhook payload", JSON.stringify(req.body));

  try {
    const call = req.body?.call;

    if (!call?.call_id) {
      return res.status(200).json({ ok: true });
    }

    // Respond immediately
    res.status(200).json({ ok: true });

    // Async processing
    setImmediate(async () => {
      try {
        await processRetellWebhook(req.body);
      } catch (err) {
        console.error("Async Retell Error:", err);
      }
    });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(200).json({ ok: true });
  }
};

  const getAllCallTranscripts = async (req, res) => {
  try {
    const calls = await CallLog.findAll({
      order: [["createdAt", "DESC"]]
    });

    return res.json(calls);
  } catch (err) {
    logger.error("[getAllCallTranscripts] Error", err);
    return res.status(500).json({
      error: "Failed to fetch call transcripts"
    });
  }
};

  //Get transcript by callId
  const getCallTranscriptByCallId = async (req, res) => {
    const { callId } = req.params;

    try {
      const call = await CallLog.findOne({ where: { callId } });

      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      return res.json(call);
    } catch (err) {
      logger.error("[getCallTranscriptByCallId] Error", err);
      return res.status(500).json({ error: "Failed to fetch transcript" });
    }
  };

  module.exports = {
  retellWebhook,
  getAllCallTranscripts,
  getCallTranscriptByCallId
};


