const { Op } = require("sequelize");
const { User, Patient, Appointment, PatientRegistrationRequest } = require("../models");
const { generateMRN } = require("../utils/patientUtils");

async function finalizeVoiceCallService(data) {
  const { email, phone, name, dob, organizationId, clinicId } = data;

  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  // FIND OR CREATE USER
  let user = await User.findOne({
    where: { [Op.or]: [{ email: normalizedEmail }, { phone }] }
  });

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      phone,
      name,
      role: "patient",
      signupByCall: true,
      registrationStatus: "auto_voice",
      organizationId,
      clinicId
    });
  }

  if (user.role === "user") {
    await user.update({ role: "patient", registrationStatus: "auto_voice" });
  }

  // FIND OR CREATE PATIENT
  let patient = await Patient.findOne({ where: { userId: user.id } });

  if (!patient) {
    const mrn = await generateMRN(clinicId);

    patient = await Patient.create({
      userId: user.id,
      name,
      dob,
      emailId: normalizedEmail,
      mrn,
      organizationId,
      clinicId
    });
  }

  // AUTO APPROVED REGISTRATION
  await PatientRegistrationRequest.findOrCreate({
    where: { userId: user.id },
    defaults: {
      userId: user.id,
      name,
      dob,
      emailId: normalizedEmail,
      clinicId,
      organizationId,
      status: "approved",
      source: "voice_agent",
      autoApproved: true
    }
  });

  // LINK PENDING APPOINTMENTS
  const pendingAppointments = await Appointment.findAll({
    where: { attendeeEmail: normalizedEmail, pendingIdentity: true }
  });

  for (const appt of pendingAppointments) {
    await appt.update({
      patient_id: patient.id,
      pendingIdentity: false,
      source: "voice_agent"
    });
  }

  return {
    patientId: patient.id,
    userId: user.id,
    linkedAppointments: pendingAppointments.length
  };
}

module.exports = finalizeVoiceCallService;
