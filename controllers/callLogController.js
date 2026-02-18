const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { CallLog, User, Patient } = require("../models");
const { logger } = require("../utils/logger");
const finalizeVoiceCallService = require("../services/finalizeVoiceCallService");

async function processRetellWebhook(body) {

  // ================================
  // CASE 1: Official Retell Event
  // ================================
  if (body?.event && body?.call) {

    const event = body.event;
    const call = body.call;
    const callId = call.call_id;

    if (!callId) {
      console.log("Missing call_id in official event");
      return;
    }

    const dynamic = call.retell_llm_dynamic_variables || {};

    const name = dynamic.customer_name?.trim() || null;
    const dob = dynamic.dob || null;
    const email = dynamic.email?.toLowerCase()?.trim() || null;
    const phone = call.from_number || null;

    const [callLog] = await CallLog.findOrCreate({
      where: { callId },
      defaults: {
        callId,
        agentId: call.agent_id,
        organizationId: "sigma-healthsense",
        clinicId: "newhope-1",
        name,
        phone,
        attendeeEmail: email,
        callStatus: call.call_status,
        startTimestamp: call.start_timestamp,
        endTimestamp: call.end_timestamp,
        durationSeconds: call.duration_seconds,
        disconnectionReason: call.disconnection_reason,
        transcript: call.transcript || null,
        finalized: false
      }
    });

    // Always update latest data
    await callLog.update({
      agentId: call.agent_id,
      name,
      phone,
      attendeeEmail: email,
      callStatus: call.call_status,
      startTimestamp: call.start_timestamp,
      endTimestamp: call.end_timestamp,
      durationSeconds: call.duration_seconds,
      disconnectionReason: call.disconnection_reason,
      transcript: call.transcript || null
    });

    // Only finalize on call_analyzed
    if (event === "call_analyzed") {

  const analysis = call.call_analysis || {};
  const extracted = analysis.custom_analysis_data || {};

  await callLog.update({
    transcript: call.transcript || null,
    name: extracted.name || null,
    attendeeEmail: extracted.email?.toLowerCase()?.trim() || null,
    phone: extracted.phone || null,
    dob: extracted.dob || null,
    appointmentDate: extracted.appointment_date || null,
    appointmentTime: extracted.appointment_time || null,
    callStatus: "analyzed",
    finalized: true
  });

  console.log("✅ Extracted structured data from call_analysis");
  return;
}
}


  // =====================================
// CASE 2: Tool Call Payload (send-call-transcripts)
// =====================================
if (body?.callId && body?.transcript) {

  const {
    callId,
    organizationId,
    clinicId,
    name,
    email,
    phone,
    appointmentDate,
    appointmentTime,
    transcript
  } = body;

  const [callLog] = await CallLog.findOrCreate({
    where: { callId },
    defaults: {
      callId,
      organizationId,
      clinicId,
      transcript,
      finalized: false
    }
  });

  await callLog.update({
    organizationId,
    clinicId,
    transcript,
    name: name || null,
    attendeeEmail: email?.toLowerCase()?.trim() || null,
    phone: phone || null,
    appointmentDate: appointmentDate || null,
    appointmentTime: appointmentTime || null
  });

  console.log("Tool call data saved for:", callId);
  return;
}

// ====================================
// CASE 2: Flat Extraction Payload
// ====================================
// CASE: Post-call extraction webhook
if (body?.call_id && body?.data) {

  const { call_id, data } = body;

  const callLog = await CallLog.findOne({
    where: { callId: call_id }
  });

  if (!callLog) {
    console.log("No CallLog found for:", call_id);
    return;
  }

  await callLog.update({
    name: data.name || null,
    attendeeEmail: data.email?.toLowerCase()?.trim() || null,
    phone: data.phone || null,
    dob: data.dob || null,
    appointmentDate: data.appointment_date || null,
    appointmentTime: data.appointment_time || null
  });

  console.log("Extraction data saved for:", call_id);
  return;
}


  console.log("Unknown webhook structure received");
}


const retellWebhook = async (req, res) => {
  try {
    const body = req.body;

    console.log("Has event?", !!body?.event);
    console.log("Has callId?", !!body?.callId);
    console.log("Has call.call_id?", !!body?.call?.call_id);


    console.log("RETELL WEBHOOK:", JSON.stringify(body, null, 2));

    /* =====================================================
       🟢 1. CALL LIFECYCLE EVENTS (call_started / ended / analyzed)
    ====================================================== */
    if (body?.event && body?.call?.call_id) {

      const { event, call } = body;
      const callId = call.call_id;

      console.log("callId from webhook:", JSON.stringify(callId));

      const cleanCallId = callId?.trim();

      /* 🔵 CREATE ONLY ON call_started */
      if (event === "call_started") {
        await CallLog.create({
          callId: cleanCallId,
          agentId: call.agent_id,
          organizationId: "sigma-healthsense",
          clinicId: "newhope-1",
          callStatus: call.call_status || "ongoing",
          startTimestamp: call.start_timestamp,
          phone: body.phone || null,
          finalized: false
        });

        console.log("✅ CallLog created (call_started)");
        return res.sendStatus(200);
      }

      const callLog = await CallLog.findOne({ where: { callId } });

      if (!callLog) {
        console.log("⚠️ CallLog not found for:", callId);
        return res.sendStatus(200);
      }

      /* 🟡 CALL ENDED */
      if (event === "call_ended") {
        await callLog.update({
          callStatus: call.call_status || "ended",
          endTimestamp: call.end_timestamp,
          durationSeconds: call.duration_seconds,
          disconnectionReason: call.disconnection_reason
        });

        console.log("✅ Updated (call_ended)");
        return res.sendStatus(200);
      }

      /* 🟣 CALL ANALYZED */
      if (event === "call_analyzed") {

  const dynamic = call.call_analysis?.custom_analysis_data || {};

  console.log("ANALYSIS DATA:", dynamic);

  const updatedFields = {
    transcript: call.transcript || callLog.transcript,
    callStatus: "analyzed",
    finalized: true
  };

  // Only update if value exists
  if (dynamic.name)
  updatedFields.name = dynamic.name;

  if (dynamic.email)
    updatedFields.email =
      dynamic.email.toLowerCase().trim();

  if (dynamic.phone)
    updatedFields.phone = dynamic.phone;

  if (dynamic.dob)
    updatedFields.dob = dynamic.dob;

  if (dynamic.appointment_date)
    updatedFields.appointmentDate =
      dynamic.appointment_date;

  if (dynamic.appointment_time)
    updatedFields.appointmentTime =
      dynamic.appointment_time;


  console.log("SAFE UPDATE:", updatedFields);

  await callLog.update(updatedFields);

  console.log("✅ Updated (call_analyzed safely)");
  return res.sendStatus(200);
}
    }
    /* =====================================================
       🟢 2. TOOL / EXTRACTION PAYLOAD (with callId)
    ====================================================== */
    if (body?.callId || body?.call_id) {

      const callId = body.callId || body.call_id;

      const callLog = await CallLog.findOne({
        where: { callId: cleanCallId }
      });

      if (!callLog) {
        console.log(
          "⚠️ Tool/extraction arrived before call_started:",
          callId
        );
        return res.sendStatus(200);
      }

      const dynamicVariables = {
        patientName: body.name || callLog.name,
        patientEmail:
          body.email?.toLowerCase()?.trim() ||
          callLog.attendeeEmail,
        patientPhone: body.phone || callLog.phone,
        patientDOB: body.dob || callLog.dob,
        appointmentDate:
          body.appointmentDate || callLog.appointmentDate,
        appointmentTime:
          body.appointmentTime || callLog.appointmentTime,
        scheduledBy: "voice_agent"
      };

      console.log(
        "DYNAMIC VARIABLES:",
        JSON.stringify(dynamicVariables, null, 2)
      );

      await callLog.update({
        transcript: body.transcript || callLog.transcript,
        name: dynamicVariables.patientName,
        email: dynamicVariables.patientEmail,
        phone: dynamicVariables.patientPhone,
        dob: dynamicVariables.patientDOB,
        appointmentDate: dynamicVariables.appointmentDate,
        appointmentTime: dynamicVariables.appointmentTime
      });

      console.log("✅ Tool/extraction updated");
      return res.sendStatus(200);
    }

    /* =====================================================
       🟢 3. DIRECT EXTRACTION PAYLOAD (No callId)
       This matches your current incoming payload
    ====================================================== */
    if (body?.transcript && body?.email) {

      console.log("📥 Direct extraction payload received");

      const dynamicVariables = {
        patientName: body.name || null,
        patientEmail: body.email?.toLowerCase()?.trim() || null,
        patientPhone: body.phone || null,
        patientDOB: body.dob || null,
        appointmentDate: body.appointmentDate || null,
        appointmentTime: body.appointmentTime || null,
        scheduledBy: "voice_agent"
      };

      console.log(
        "DYNAMIC VARIABLES:",
        JSON.stringify(dynamicVariables, null, 2)
      );

      // OPTIONAL: If you want to store without callId,
      // you could create a new CallLog here.

      return res.sendStatus(200);
    }

    /* =====================================================
       ❗ UNKNOWN STRUCTURE
    ====================================================== */
    console.log("⚠️ Unknown webhook structure");
    return res.sendStatus(200);

  } catch (err) {
    console.error("❌ Retell webhook error:", err);
    return res.sendStatus(200);
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


