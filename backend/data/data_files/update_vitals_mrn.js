const fs = require('fs');
const path = require('path');

// Paths to your files
const patientsPath = path.join(__dirname, 'hospital_eye_100_patients_array.json');
const vitalsPath = path.join(__dirname, 'hospital_eye_vitals_array.json');
const outputPath = path.join(__dirname, 'hospital_eye_vitals_array_updated.json');

// Load patient data and build a mapping from _id to mrn
const patients = JSON.parse(fs.readFileSync(patientsPath, 'utf8'));
const idToMrn = {};
patients.forEach(patient => {
  idToMrn[patient._id] = patient.mrn;
});

// Load vitals data
const vitals = JSON.parse(fs.readFileSync(vitalsPath, 'utf8'));

// Update each vital record
vitals.forEach(vital => {
  if (vital.patientId && idToMrn[vital.patientId]) {
    vital.mrn = idToMrn[vital.patientId];
    delete vital.patientId;
  }
});

// Save the updated vitals array
fs.writeFileSync(outputPath, JSON.stringify(vitals, null, 2), 'utf8');
console.log('Vitals data updated and saved to', outputPath);