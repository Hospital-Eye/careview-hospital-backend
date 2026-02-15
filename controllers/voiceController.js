const { Op } = require("sequelize");
const { User, Patient, PatientRegistrationRequest, Appointment } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { generateMRN } = require("./patientController");
const finalizeVoiceCallService = require("../services/finalizeVoiceCallService");

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

const finalizeVoiceCall = async (req, res) => {
  try {
    const callId = req.body?.call?.call_id;
    const args = req.body?.args || {};

    if (!callId) {
      throw new Error("Missing call_id from Retell");
    }

    const result = await finalizeVoiceCallService({
      ...args,
      callId // inject real ID
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Finalize Error:", err);
    return res.status(200).json({ success: false });
  }
};


module.exports = {
    identityCheck,
    finalizeVoiceCall
};
