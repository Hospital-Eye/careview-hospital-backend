const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { Appointment, Patient, Organization, Clinic } = require("../models");
const { logger } = require("../utils/logger");

const ORGANIZATION_ID = process.env.DEFAULT_ORGANIZATION_ID;
const CLINIC_ID = process.env.DEFAULT_CLINIC_ID;


//Webhook signature verification middleware
const verifyCalSignature = (req, res, next) => {
  const signature = req.headers["x-cal-signature-256"];

  if (!signature) {
    logger.warn("[Cal Webhook] Missing x-cal-signature header");
    return res.status(401).json({ message: "Missing Cal signature" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.CAL_WEBHOOK_SECRET)
    .update(req.body) // must be RAW buffer
    .digest("hex");

  if (signature !== expectedSignature) {
    logger.warn("[Cal Webhook] Invalid signature");
    return res.status(401).json({ message: "Invalid Cal signature" });
  }

  next();
};


//webhook
router.post("/cal", (req, res, next) => {
  next();
}, verifyCalSignature, async (req, res) => {
  let body;

  try {
    body = JSON.parse(req.body.toString());
  } catch (err) {
    logger.error("[Cal Webhook] Invalid JSON body");
    return res.status(400).json({ message: "Invalid JSON" });
  }

  const { triggerEvent, payload } = body;

  logger.info(`[Cal Webhook] Event received: ${triggerEvent}`);

  try {
    switch (triggerEvent) {
      case "BOOKING_CREATED":
        await handleBookingCreated(payload);
        break;

      case "BOOKING_CANCELLED":
        await handleBookingCancelled(payload);
        break;

      case "BOOKING_RESCHEDULED":
        await handleBookingRescheduled(payload);
        break;

      default:
        logger.warn(`[Cal Webhook] Unsupported event: ${triggerEvent}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error("DB MESSAGE:", err.message);
    logger.error("SQL:", err.sql);
    logger.error("DETAIL:", err.parent?.detail);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

//event handlers
const handleBookingCreated = async (payload) => {
  const { uid, startTime, endTime, attendees } = payload;

  logger.info("[Cal Booking] payload:", JSON.stringify(payload, null, 2));
  logger.info("[Cal Booking] startTime:", startTime, "endTime:", endTime);

  const organizationId = await resolveOrganizationId();
  const clinicId = await resolveClinicId();

  const attendeeEmail =
    attendees?.[0]?.email ||
    payload?.responses?.email ||
    null;

  let patientId = null;

  if (attendeeEmail) {
    const patient = await Patient.findOne({
      where: { emailId: attendeeEmail }
    });

    if (patient) {
      patientId = patient.id;
    }
  }

  await Appointment.findOrCreate({
    where: { booking_id: uid },
    defaults: {
      patient_id: patientId,
      clinicId,
      organizationId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      attendeeEmail,
      pendingIdentity: !patientId,
      scheduledBy: patientId ? "portal" : "voice_agent",
      status: "scheduled"
    }
  });
};



const handleBookingCancelled = async (payload) => {
  const { uid } = payload;

  const appointment = await Appointment.findOne({
    where: { booking_id: uid }
  });

  if (!appointment) {
    logger.warn(`[Cal Webhook] Appointment not found for cancel: ${uid}`);
    return;
  }

  await appointment.update({ status: "cancelled" });

  logger.info(`[Cal Webhook] Appointment cancelled: ${uid}`);
};

const handleBookingRescheduled = async (payload) => {
  const {
    rescheduleUid,
    uid,
    startTime,
    endTime
  } = payload;

  const appointment = await Appointment.findOne({
    where: { booking_id: rescheduleUid }
  });

  if (!appointment) {
    logger.warn(
      `[Cal Webhook] Appointment not found for reschedule: ${rescheduleUid}`
    );
    return;
  }

  await appointment.update({
    booking_id: uid,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: "rescheduled"
  });

  logger.info(
    `[Cal Webhook] Appointment rescheduled: ${rescheduleUid} → ${uid}`
  );
};

//resolvers
const resolvePatientId = async (payload) => {
  const patientId = payload.metadata?.patientId;

  if (patientId) return patientId;

  if (!email) {
    throw new Error("No patient email found in Cal payload");
  }

  const patient = await Patient.findOne({
    where: { emailId: email }
  });

  if (!patient) {
    throw new Error(`Patient not found for email: ${email}`);
  }
  return patient.id;
};


const resolveOrganizationId = async () => {
  if (!ORGANIZATION_ID) {
    throw new Error("DEFAULT_ORGANIZATION_ID not configured");
  }
  return ORGANIZATION_ID;
};

const resolveClinicId = async () => {
  if (!CLINIC_ID) {
    throw new Error("DEFAULT_CLINIC_ID not configured");
  }
  return CLINIC_ID;
};


module.exports = router;
