// utils/patientUtils.js
const { Patient } = require("../models");

/**
 * Generate a new MRN for a clinic.
 * @param {string} clinicId - The clinic ID, e.g., "newhope-1"
 * @returns {string} MRN in format PREFIX-SEQ, e.g., "NEW1-1001"
 */
const generateMRN = async (clinicId) => {
  if (!clinicId) throw new Error("clinicId is required to generate MRN");

  // Generate clinic prefix
  const parts = clinicId.split("-");
  const name = parts[0].substring(0, 3).toUpperCase();
  const number = parts[1] || "1";
  const prefix = `${name}${number}`;

  // Get last patient in this clinic
  const lastPatient = await Patient.findOne({
    where: { clinicId },
    order: [["mrn", "DESC"]],
    limit: 1
  });

  let lastSeq = 1000; // default starting sequence
  if (lastPatient?.mrn) {
    const num = parseInt(lastPatient.mrn.split("-")[1], 10);
    if (!isNaN(num)) lastSeq = num;
  }

  return `${prefix}-${lastSeq + 1}`;
};

module.exports = { generateMRN };
