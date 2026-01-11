const express = require("express");
const { Appointment } = require("../models"); 
const { protect, authorize, scope, patientCheck } = require('../middleware/authMiddleware');
const { logger } = require("../utils/logger");

const router = express.Router();

const { getAppointments } = require('../controllers/appointmentController');

//view all schedule appointments
router.get('/appointments', protect, patientCheck, authorize('admin', 'doctor', 'manager', 'nurse'), scope, getAppointments);

// POST /webhooks/cal
router.post("/cal", async (req, res) => {
  const endpoint = "calWebhook";

  try {
    const { triggerEvent, payload } = req.body;

    logger.info(`[${endpoint}] Event received: ${triggerEvent}`);

    const calBookingId = payload?.uid;
    const startTime = payload?.startTime;
    const endTime = payload?.endTime;

    // patientId passed from metadata during booking creation 
    const patientId = payload?.metadata?.patient_id;

    if (!calBookingId || !startTime || !endTime || !patientId) {
      logger.error(`[${endpoint}] Missing required payload fields`);
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    switch (triggerEvent) {
      case "BOOKING_CREATED":
        await Appointment.upsert({
          cal_booking_id: calBookingId,
          patient_id: patientId,
          start_time: startTime,
          end_time: endTime,
          clinic_id: payload.eventType?.metadata?.clinic_id,
          organization_id: payload.eventType?.metadata?.organization_id,
          status: "scheduled"
        });
        break;

      case "BOOKING_RESCHEDULED":
        await Appointment.update(
          {
            start_time: startTime,
            end_time: endTime,
            status: "rescheduled"
          },
          {
            where: { cal_booking_id: calBookingId }
          }
        );
        break;

      case "BOOKING_CANCELLED":
        await Appointment.update(
          { status: "cancelled" },
          {
            where: { cal_booking_id: calBookingId }
          }
        );
        break;

      default:
        logger.warn(`[${endpoint}] Unhandled event: ${triggerEvent}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`[${endpoint}] ${err.message}`);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
});

module.exports = router;
