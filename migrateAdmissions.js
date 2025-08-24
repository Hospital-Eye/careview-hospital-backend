const mongoose = require('mongoose');
const Admission = require('./models/Admission');
const Staff = require('./models/Staff');

async function fixAdmissions() {
  await mongoose.connect('mongodb://localhost:27017/your-db', { useNewUrlParser: true, useUnifiedTopology: true });

  const admissions = await Admission.find();
  for (let admission of admissions) {
    // Fix admittedByStaffId
    if (typeof admission.admittedByStaffId === 'string') {
      const staff = await Staff.findOne({ name: admission.admittedByStaffId });
      if (staff) admission.admittedByStaffId = staff._id;
      else admission.admittedByStaffId = null;
    }

    // Fix attendingPhysicianId
    if (typeof admission.attendingPhysicianId === 'string') {
      const physician = await Staff.findOne({ name: admission.attendingPhysicianId });
      if (physician) admission.attendingPhysicianId = physician._id;
      else admission.attendingPhysicianId = null;
    }

    await admission.save();
  }

  console.log('Admissions migrated successfully.');
  mongoose.disconnect();
}

fixAdmissions();
