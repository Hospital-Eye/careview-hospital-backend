const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { CallLog, User } = require("../models");
const { logger } = require("../utils/logger");

module.exports = ({ transporter }) => {
  /**
   * Retell Webhook
   * IMPORTANT: Must respond FAST. No blocking async work.
   */
  const retellWebhook = async (req, res) => {
    const endpoint = "retellWebhook";

    try {
      const call = req.body?.call;
      if (!call) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const dynamic = call.retell_llm_dynamic_variables || {};
      const name = dynamic.customer_name || null;
      const email = dynamic.email || null;
      const dob = dynamic.dob || null;
      const phone = call.from_number || null;

      const transcript =
        call.transcript || call.call_analysis?.transcript || null;

      logger.info(
        `[${endpoint}] Incoming call ${call.call_id} from ${phone}`
      );

      let user = null;

      if (email) {
        user = await User.findOne({ where: { email } });
      }

      // Create user if needed
      let defaultPassword = null;

      if (!user && email && name && phone && dob) {
        defaultPassword = crypto.randomUUID().slice(0, 8);
        const hashed = await bcrypt.hash(defaultPassword, 10);

        user = await User.create({
          name,
          email,
          phone,
          password: hashed,
          signupByCall: true,
          isActive: true,
          role: "user",
          organizationId: "sigma-healthsense",
          clinicId: "newhope-1",
        });
      }

      // Store / update call log (NON-BLOCKING, SAFE)
      await CallLog.upsert({
        callId: call.call_id,
        agentId: call.agent_id,
        organizationId: "sigma-healthsense",
        clinicId: "newhope-1",
        userId: user ? user.id : null,
        name,
        phone,
        email,
        callStatus: call.call_status,
        startTimestamp: call.start_timestamp,
        endTimestamp: call.end_timestamp,
        durationSeconds: call.duration_seconds,
        disconnectionReason: call.disconnection_reason,
        transcript,
      });

      // ✅ RESPOND IMMEDIATELY (critical)
      res.json({ message: "Webhook processed successfully" });

      // 🔥 Fire-and-forget email (never block webhook)
      if (user && defaultPassword) {
        transporter
          .sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "Your HospitalEye Account Credentials",
            html: `
              <p>Hello ${name},</p>
              <p>Your account has been created via our voice assistant.</p>
              <p><b>Email:</b> ${email}</p>
              <p><b>Temporary Password:</b> ${defaultPassword}</p>
              <p>Please log in and change your password.</p>
            `,
          })
          .catch((err) =>
            logger.error(`[${endpoint}] Email failed`, err)
          );
      }
    } catch (err) {
      logger.error(`[${endpoint}] Error`, err);
      return res.status(500).json({ error: "Webhook failed" });
    }
  };

  /**
   * Get all call transcripts
   * GUARANTEED to never hang
   */
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
  console.error("FULL ERROR:", err);
  console.error("PG ERROR:", err.original);
  console.error("SQL:", err.sql);

  return res.status(500).json({
    error: "Failed to fetch transcripts",
    details: err.original?.message,
  });
}

  };

  /**
   * Get transcript by callId
   */
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
