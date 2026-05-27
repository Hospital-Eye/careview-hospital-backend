const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { CallLog, User, Patient } = require("../models");
const { logger } = require("../utils/logger");
const finalizeVoiceCallService = require("../services/finalizeVoiceCallService");


const retellWebhook = async (req, res, next) => {
  try {
    const body = req.body;

    if (body?.event && body?.call?.call_id) {

      const { event, call } = body;
      const callId = call.call_id;

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

        return res.sendStatus(200);
      }

      const callLog = await CallLog.findOne({ where: { callId } });

      if (!callLog) {
        
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

        
        return res.sendStatus(200);
      }

      /* 🟣 CALL ANALYZED */
      if (event === "call_analyzed") {

  const dynamic = call.call_analysis?.custom_analysis_data || {};

  const updatedFields = {
      transcript: call.transcript || callLog.transcript,
      callStatus: "analyzed",
      finalized: true
    };

    // Extracted dynamic fields
    if (dynamic.name)
      updatedFields.name = dynamic.name;

    if (dynamic.email)
      updatedFields.email =
        dynamic.email.toLowerCase().trim();

    if (dynamic.phone)
      updatedFields.phone = dynamic.phone;

    if (dynamic.dob)
      updatedFields.dob = dynamic.dob;

    if (dynamic.gender)
      updatedFields.gender = dynamic.gender;

    if (dynamic.appointment_date)
      updatedFields.appointmentDate =
        dynamic.appointment_date;

    if (dynamic.appointment_time)
      updatedFields.appointmentTime =
        dynamic.appointment_time;

    // 🔥 These are NOT inside dynamic
    if (call.call_analysis?.call_summary)
      updatedFields.callSummary =
        call.call_analysis.call_summary;

    if (call.call_cost?.total_duration_seconds)
      updatedFields.durationSeconds =
        call.call_cost.total_duration_seconds;

    await callLog.update(updatedFields);

    return res.sendStatus(200);
}
    }
    /* =====================================================
       🟢 2. TOOL / EXTRACTION PAYLOAD (with callId)
    ====================================================== */
    if (body?.callId || body?.call_id) {

      const callId = body.callId || body.call_id;
      const cleanCallId = callId?.trim();

      const callLog = await CallLog.findOne({
        where: { callId: cleanCallId }
      });

      if (!callLog) {
        console.log(
          "Tool/extraction arrived before call_started:",
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

      await callLog.update({
        transcript: body.transcript || callLog.transcript,
        name: dynamicVariables.patientName,
        email: dynamicVariables.patientEmail,
        phone: dynamicVariables.patientPhone,
        dob: dynamicVariables.patientDOB,
        gender: body.gender || callLog.gender,
        callSummary: body.call?.call_analysis?.call_summary ?? callLog.callSummary,
        appointmentDate: dynamicVariables.appointmentDate,
        appointmentTime: dynamicVariables.appointmentTime,
        durationSeconds: body.call?.call_cost?.total_duration_seconds ?? callLog.durationSeconds,
      });

      console.log("Tool/extraction updated");
      return res.sendStatus(200);
    }

    /* =====================================================
       🟢 3. DIRECT EXTRACTION PAYLOAD (No callId)
       This matches your current incoming payload
    ====================================================== */
    if (body?.transcript && body?.email) {

      console.log("Direct extraction payload received");

      const dynamicVariables = {
        patientName: body.name || null,
        patientEmail: body.email?.toLowerCase()?.trim() || null,
        patientPhone: body.phone || null,
        patientDOB: body.dob || null,
        appointmentDate: body.appointmentDate || null,
        appointmentTime: body.appointmentTime || null,
        scheduledBy: "voice_agent"
      };

      // OPTIONAL: If you want to store without callId,
      // you could create a new CallLog here.

      return res.sendStatus(200);
    }

    /* =====================================================
       ❗ UNKNOWN STRUCTURE
    ====================================================== */
    logger.warn("Unknown webhook structure:", JSON.stringify(body, null, 2));
    return res.sendStatus(200);

  } catch (err) {
    logger.error("Retell webhook error:", err);
    return next(err);
  }
};

  const getAllCallTranscripts = async (req, res, next) => {
  try {
    const calls = await CallLog.findAll({
      order: [["createdAt", "DESC"]]
    });

    return res.json(calls);
  } catch (err) {
    logger.error("[getAllCallTranscripts] Error", err);
    return next(err);
  }
};

  //Get transcript by callId
  const getCallTranscriptByCallId = async (req, res, next) => {
    const { callId } = req.params;

    try {
      const call = await CallLog.findOne({ where: { callId } });

      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      return res.json(call);
    } catch (err) {
      logger.error("[getCallTranscriptByCallId] Error", err);
      return next(err);
    }
  };

  module.exports = {
  retellWebhook,
  getAllCallTranscripts,
  getCallTranscriptByCallId
};

