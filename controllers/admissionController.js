const Admission = require('../models/Admission');
const Patient = require('../models/Patient'); 

//create a new admission
const createAdmission = async (req, res) => {
  try {
    const { patientId, admittedByStaffId, attendingPhysicianId, admissionReason, room, acuityLevel } = req.body;

    // Resolve admittedByStaffId if employeeId is provided
    let admittedStaffIdResolved = null;
    if (admittedByStaffId) {
      const staff = await Staff.findOne({ employeeId: admittedByStaffId });
      if (!staff) return res.status(400).json({ error: 'Admitting staff not found' });
      admittedStaffIdResolved = staff._id;
    }

    // Resolve attendingPhysicianId if employeeId is provided
    let attendingPhysicianIdResolved = null;
    if (attendingPhysicianId) {
      const physician = await Staff.findOne({ employeeId: attendingPhysicianId });
      if (!physician) return res.status(400).json({ error: 'Attending physician not found' });
      attendingPhysicianIdResolved = physician._id;
    }

    // Resolve room by details OR accept ObjectId directly
    let roomId;
    if (typeof room === "string" && mongoose.Types.ObjectId.isValid(room)) {
      roomId = room; // frontend passed room._id
    } else if (room && room.roomNumber && room.unit && room.roomType) {
      const roomDoc = await Room.findOne({
        roomNumber: room.roomNumber,
        unit: room.unit,
        roomType: room.roomType,
        clinicId: req.user.clinicId,
        organizationId: req.user.organizationId
      });
      if (!roomDoc) return res.status(400).json({ error: "Room not found" });
      roomId = roomDoc._id;
    } else {
      return res.status(400).json({ error: "Room is required" });
    }

    // ✅ Create admission
    const admission = new Admission({
      patientId,
      organizationId: req.user.organizationId,
      clinicId: req.user.clinicId,
      room: roomId,
      admittedByStaffId: admittedStaffIdResolved,
      attendingPhysicianId: attendingPhysicianIdResolved,
      admissionReason,
      acuityLevel, // required field
      status: "Active",
    });

    const savedAdmission = await admission.save();

    // Update patient with admission + room
    await Patient.findByIdAndUpdate(
      patientId,
      { currentAdmissionId: savedAdmission._id, room: roomId, status: "Active" },
      { new: true }
    );

    res.status(201).json(savedAdmission);
  } catch (err) {
    console.error("Error creating admission:", err);
    res.status(400).json({ error: err.message });
  }
};


//get all admissions
const getAdmissions = async (req, res) => {
  try {
    const admissions = await Admission.find()
      .populate('patientId', 'name mrn') // only get name & MRN
      .populate('room'); // populate room object

    // Map room number for response without modifying DB
    const result = admissions.map(adm => ({
      patientName: adm.patientId?.name || '—',
      mrn: adm.patientId?.mrn || '—',
      roomNumber: adm.room?.roomNumber || '—', // fallback if not populated
      status: adm.status,
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
