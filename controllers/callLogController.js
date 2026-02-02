const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { CallLog, User, Patient } = require("../models");
const { logger } = require("../utils/logger");

module.exports = ({ transporter }) => {
  // Retell Webhook
  const retellWebhook = async (req, res) => {
    const endpoint = "retellWebhook";

    try {
      const event = req.body?.event;
      const call = req.body?.call;

      // Always ACK webhook, even if payload is weird
      if (!call || !call.call_id) {
        logger.warn(`[${endpoint}] Invalid payload`);
        return res.status(200).json({ ok: true });
      }

      const dynamic = call.retell_llm_dynamic_variables || {};

      const name = dynamic.customer_name?.trim() || null;
      const dob = dynamic.dob || null;
      const email = dynamic.email || null;
      const phone = call.from_number || null;

      logger.info(
        `[${endpoint}] Event=${event} Call=${call.call_id}`
      );

      //check if patient exists (name + dob based)
      let patient = null;

      if (name && dob) {
        const normalizedName = name.toLowerCase();

        patient = await Patient.findOne({
          where: {
            normalized_full_name: normalizedName,
            date_of_birth: dob,
          },
        });

        if (patient) {
          logger.info(
            `[${endpoint}] Patient verified: ${patient.id}`
          );
        } else {
          logger.info(
            `[${endpoint}] No patient found for name=${name}, dob=${dob}`
          );
        }
      }

      //check if user exists (email-based)
      let user = null;
      if (email) {
        user = await User.findOne({ where: { email } });
      }

      
      // ALWAYS upsert call metadata
      await CallLog.upsert({
        callId: call.call_id,
        agentId: call.agent_id,
        organizationId: "sigma-healthsense",
        clinicId: "newhope-1",
        userId: user?.id ?? null,
        patientId: patient?.id ?? null,
        name,
        phone,
        email,
        callStatus: call.call_status,
        startTimestamp: call.start_timestamp,
        endTimestamp: call.end_timestamp,
        durationSeconds: call.duration_seconds,
        disconnectionReason: call.disconnection_reason,
      });

      
      // STORE TRANSCRIPT ONLY WHEN READY
      if (event === "call.analysis.completed") {
        const transcript =
        call.call_analysis?.transcript ||
        call.call_analysis?.transcript_text ||
        call.transcript ||
        null;

      if (transcript && transcript.length > 0) {
        const [updated] = await CallLog.update(
          { transcript },
          { where: { callId: call.call_id } }
        );

        logger.info(
          `[${endpoint}] Transcript update rows=${updated}`
        );
      }
   }

      // ALWAYS respond 200 (Retell retries on non-200)
      return res.status(200).json({ ok: true });
    } catch (err) {
      logger.error(`[${endpoint}] Error`, err);

      // Never fail a webhook
      return res.status(200).json({ ok: true });
    }
  };

  //Get all call transcripts
  const getAllCallTranscripts = async (req, res) => {
    try {
      const transcripts = await CallLog.findAll({
        order: [["createdAt", "DESC"]],
        attributes: [
          "callId",
          "name",
          "email",
          "phone",
          "callStatus",
          "durationSeconds",
          "transcript",
          "createdAt",
        ],
      });

      return res.json(transcripts);
    } catch (err) {
      logger.error("[getAllCallTranscripts] Error", err);
      return res.status(500).json({ error: "Failed to fetch transcripts" });
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

  return {
    retellWebhook,
    getAllCallTranscripts,
    getCallTranscriptByCallId,
  };
};
