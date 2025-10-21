const Admission = require('../models/Admission');
const Patient = require('../models/Patient'); 
const Staff = require('../models/Staff');
const Room = require('../models/Room');

// Create a new admission
const createAdmission = async (req, res) => {
  console.log("🩺 createAdmission endpoint hit");

  console.log(req.body);

  try {
    const {
      patientId,
      admittedByStaffId,      // employeeId of admitting staff
      attendingPhysicianName, // physician name
      admissionReason,
      acuityLevel,
      unit,
      roomType
    } = req.body;

    // ------------------- Resolve patient -------------------
    const patient = await Patient.findById(patientId);

    if (!patient) {
      console.warn(`❌ Patient not found for ID: ${patientId}`);
      return res.status(404).json({ error: "Patient not found" });
    }


    // ------------------- Resolve admitting staff -------------------
    let admittedStaffIdResolved = null;

    if (admittedByStaffId) {
      console.log("🔍 Looking for admitting staff with ID:", admittedByStaffId);
      const staff = await Staff.findById(admittedByStaffId);
      console.log("🧠 Found staff:", staff);

      if (!staff) {
        console.warn(`❌ No staff found for ID ${admittedByStaffId}`);
        return res.status(400).json({ error: "Admitting staff not found" });
      }

      admittedStaffIdResolved = staff._id;
      console.log("✅ Staff resolved successfully:", admittedStaffIdResolved);
    }

    // ------------------- Resolve attending physician -------------------
    let attendingPhysicianIdResolved = null;
    if (attendingPhysicianName) {
      console.log("🔍 Looking for attending physician:", attendingPhysicianName);
      const physician = await Staff.findOne({
        name: attendingPhysicianName,
        organizationId: req.user.organizationId,
        clinicId: req.user.clinicId,
        role: "doctor"
      });
      console.log("🧠 Found physician:", physician);
      if (!physician) {
        console.warn("❌ Attending physician not found");
        return res.status(400).json({ error: "Attending physician not found" });
      }
      attendingPhysicianIdResolved = physician._id;
    }

    // ------------------- Resolve allocated Room -------------------
    const allocatedRoom = await Room.findOne({
    _id: req.body.room,
    organizationId: patient.organizationId,
    clinicId: patient.clinicId
    }).lean();

    if (!allocatedRoom) {
      return res.status(400).json({ error: "Specified room not found or unavailable" });
    }

    // ------------------- Create admission -------------------
    const admission = new Admission({
    patientId: patient._id,
    organizationId: patient.organizationId,
    clinicId: patient.clinicId,
    room: allocatedRoom._id,
    admittedByStaffId: admittedStaffIdResolved,
    attendingPhysicianId: attendingPhysicianIdResolved,
    admissionReason,
    acuityLevel,
    status: "Active",
    timestamps: { created: new Date() }
    });

    const savedAdmission = await admission.save();

    // ------------------- Update patient record -------------------
    await Patient.findByIdAndUpdate(
      patient._id,
      {
        currentAdmissionId: savedAdmission._id,
        room: allocatedRoom._id,
        status: "Active"
      },
      { new: true }
    );

    console.log("🎉 Admission successfully created:", savedAdmission._id);

    // ------------------- Respond with admission + room info -------------------
    res.status(201).json({
      admission: savedAdmission,
      assignedRoom: {
        roomId: allocatedRoom._id,
        roomNumber: allocatedRoom.roomNumber,
        unit: allocatedRoom.unit,
        roomType: allocatedRoom.roomType,
        capacity: allocatedRoom.capacity
      }
    });

  } catch (err) {
    console.error("Error creating admission:", err);
    res.status(400).json({ error: err.message });
  }
};

// get all admissions for the user's clinic & org
const getAdmissions = async (req, res) => {
  try {
    // assuming you attach clinicId & organizationId to req.user in your auth middleware
    const { clinicId, organizationId } = req.user;

    const filter = req.scopeFilter || {};

    const admissions = await Admission.find(filter)
      .populate('patientId', 'name mrn') // only get name & MRN
      .populate('room'); // populate room object

    const result = admissions.map(adm => ({
      _id: adm._id,
      patientName: adm.patientId?.name || '—',
      mrn: adm.patientId?.mrn || '—',
      roomNumber: adm.room?.roomNumber || '—',
      acuityLevel: adm.acuityLevel,
      status: adm.status,
      admissionDate: adm.admissionDate
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// get admission by ID
const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('patientId room admittedByStaffId attendingPhysicianId');
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get active admission for a patient
const getActiveAdmissionByPatient = async (req, res) => {
  try {
    const admission = await Admission.findOne({
      patientId: req.params.patientId,
      status: 'Active'
    })
      .populate('room admittedByStaffId attendingPhysicianId');
    if (!admission) return res.status(404).json({ error: 'No active admission found' });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ error: 'Server error: No active admission by patient found' });
  }
};

// Get admissions by date range
const getAdmissionsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    const admissions = await Admission.find({
      admissionDate: { $gte: new Date(start), $lte: new Date(end) }
    }).populate('patientId room attendingPhysicianId');
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ error: 'Server error: No admissions by date range found' });
  }
};

// update an admission
const updateAdmission = async (req, res) => {
  try {
    const updated = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Admission not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update workflow stage
const updateWorkflowStage = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { currentWorkflowStage: req.body.stage },
      { new: true }
    );
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Transfer patient to another room
const transferRoom = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    admission.assignedRoomId = req.body.newRoomId;
    await admission.save();

    await Patient.findByIdAndUpdate(admission.patientId, { room: req.body.newRoomId });

    res.json({ message: 'Patient transferred successfully', admission });
  } catch (err) {
    res.status(500).json({ error: 'Server error: Unable to transfer patient' });
  }
};

//cancel an admission
const cancelAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });

    admission.status = 'Canceled';
    admission.currentWorkflowStage = 'Canceled';
    await admission.save();

    await Patient.findByIdAndUpdate(admission.patientId, { currentAdmissionId: null });

    res.json({ message: 'Admission canceled successfully', admission });
  } catch (err) {
    res.status(500).json({ error: 'Server error: Unable to cancel admission' });
  }
};

//delete an admission
const deleteAdmission = async (req, res) => {
  try {
    const deleted = await Admission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Admission not found' });

    await Patient.findByIdAndUpdate(deleted.patientId, { currentAdmissionId: null });

    res.json({ message: 'Admission deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: Unable to delete admission' });
  }
};


module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  getActiveAdmissionByPatient,
  getAdmissionsByDateRange,
  updateAdmission,
  updateWorkflowStage,
  transferRoom,
  cancelAdmission,
  deleteAdmission
};
