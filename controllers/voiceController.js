const { Op } = require("sequelize");
const dotenv = require('dotenv');
const { User, Patient, PatientRegistrationRequest, Appointment, CallLog } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { generateMRN } = require("./patientController");
const finalizeVoiceCallService = require("../services/finalizeVoiceCallService");

dotenv.config();

const identityCheck = async (req, res) => {
  try {
    console.log("🧠 IDENTITY BODY FULL:", JSON.stringify(req.body, null, 2));

    let { email, phone, dob, name } = req.body;

    // 🧼 normalize inputs
    email = email?.toLowerCase().trim() || null;
    phone = phone?.trim() || null;
    name = name?.trim() || null;
    dob = dob?.trim() || null;

    if (!email && !phone) {
      return res.status(400).json({
        error: "Email or phone required",
      });
    }

    // 🔎 Find existing user by email OR phone
    const user = await User.findOne({
      where: {
        [Op.or]: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    // ✅ CASE 1 — Patient exists
    if (user && user.role === "patient") {
      return res.json({
        status: "patient_exists",
        userId: user.id,
      });
    }

    // ✅ CASE 2 — User exists but not patient
    if (user && user.role === "user") {
      return res.json({
        status: "user_exists",
        userId: user.id,
      });
    }

    // 🚨 PREVENT creating users without email
    if (!email) {
      return res.json({
        status: "insufficient_identity",
      });
    }

    // ✅ CASE 3 — Create new temp user
    const newUser = await User.create({
      id: uuidv4(),
      email,
      phone,
      name,
      dob,
      role: "user",
      pendingIdentity: true,
    });

    return res.json({
      status: "new_user_created",
      userId: newUser.id,
    });
  } catch (err) {
    console.error("❌ identityCheck error:", err);

    return res.status(500).json({
      error: "Identity check failed",
    });
  }
};

const handleRetellEvent = async (req, res) => {
  try {
    console.log("=================================");
    console.log("EVENT WEBHOOK HIT");
    console.log("Payload:", JSON.stringify(req.body, null, 2));
    console.log("=================================");

    const { event, call } = req.body;

    /* =====================================================
       🟢 CASE 1: CALL LIFECYCLE EVENTS
    ====================================================== */
    if (event && call?.call_id) {
      const callId = call.call_id;

      // 🔹 CALL STARTED
      if (event === "call_started") {
        await CallLog.create({
          callId,
          agentId: call.agent_id,
          organizationId: "sigma-healthsense",
          clinicId: "newhope-1",
          callStatus: call.call_status,
          startTimestamp: call.start_timestamp,
          phone: call.from_number || call.to_number || null
        });

        console.log("✅ CallLog created (call_started)");
      }

      // 🔹 CALL ENDED
      if (event === "call_ended") {
        await CallLog.update(
          {
            callStatus: call.call_status || "ended",
            endTimestamp: call.end_timestamp || null,
            durationSeconds: call.duration_seconds || null,
            disconnectionReason: call.disconnection_reason || null
          },
          { where: { callId } }
        );

        console.log("✅ CallLog updated (call_ended)");
      }

      // 🔹 CALL ANALYZED
      if (event === "call_analyzed") {
        await CallLog.update(
          {
            transcript: call.transcript || null,
            finalized: true,
            callStatus: "analyzed"
          },
          { where: { callId } }
        );

        console.log("✅ CallLog updated (call_analyzed)");
      }

      return res.sendStatus(200);
    }

    /* =====================================================
       🟢 CASE 2: LLM EXTRACTION PAYLOAD
       Structure:
       {
         call_id: "...",
         output: { name, email, phone, ... }
       }
    ====================================================== */
    if (!event && req.body?.call_id) {
        const callId = (req.body.call_id || "").trim();
        const extraction = req.body.output || {};

        console.log("📦 Extraction received for:", callId);

        await CallLog.upsert({
            callId,
            name: extraction.name || null,
            email: extraction.email || null,
            phone: extraction.phone || null,
            finalized: true
        });

        console.log("✅ Upsert complete");

        return res.sendStatus(200);
        }
    /* =====================================================
       🟡 UNKNOWN PAYLOAD
    ====================================================== */
    console.log("⚠️ Unknown webhook structure received");
    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ Retell Webhook Error:", err);
    return res.sendStatus(200); // prevent retries
  }
};


module.exports = {
    identityCheck,
    handleRetellEvent
};
