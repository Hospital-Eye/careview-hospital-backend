const Admission = require('../models/Admission');
const Patient = require('../models/Patient'); 
const Staff = require('../models/Staff');
const Room = require('../models/Room');

// create a new admission
const createAdmission = async (req, res) => {
  try {
    const { 
      patientId, 
      admittedByStaffId,   // employeeId of admitting staff
      attendingPhysicianName, // physician name (instead of ID)
      admissionReason, 
      acuityLevel, 
      roomType, 
      unit 
    } = req.body;

    // 🔹 Resolve admitting staff by employeeId
    let admittedStaffIdResolved = null;
    if (admittedByStaffId) {
      const staff = await Staff.findOne({ employeeId: admittedByStaffId });
      if (!staff) return res.status(400).json({ error: "Admitting staff not found" });
      admittedStaffIdResolved = staff._id;
    }

    // 🔹 Resolve attending physician by NAME
    let attendingPhysicianIdResolved = null;
    if (attendingPhysicianName) {
      const physician = await Staff.findOne({ 
        name: attendingPhysicianName,
        organizationId: req.user.organizationId,
        clinicId: req.user.clinicId,
        role: "doctor"
      });
      if (!physician) return res.status(400).json({ error: "Attending physician not found" });
      attendingPhysicianIdResolved = physician._id;
    }

    // 🔹 Find an available room (capacity - occupiedBeds > 0)
    const availableRoom = await Room.findOneAndUpdate(
      {
        roomType,
        unit,
        clinicId: req.user.clinicId,
        organizationId: req.user.organizationId,
        $expr: { $lt: ["$occupiedBeds", "$capacity"] } // only rooms with free beds
      },
      { $inc: { occupiedBeds: 1 } }, // increment occupiedBeds
      { new: true }
    );

    if (!availableRoom) {
      return res.status(400).json({ error: `No available ${roomType} room in unit ${unit}` });
    }

    // 🔹 Create admission
    const admission = new Admission({
      patientId,
      organizationId: req.user.organizationId,
      clinicId: req.user.clinicId,
      room: availableRoom._id,
      admittedByStaffId: admittedStaffIdResolved,
      attendingPhysicianId: attendingPhysicianIdResolved,
      admissionReason,
      acuityLevel,
      status: "Active",
    });

    const savedAdmission = await admission.save();

    // 🔹 Update patient with admission + room
    await Patient.findByIdAndUpdate(
      patientId,
      { currentAdmissionId: savedAdmission._id, room: availableRoom._id, status: "Active" },
      { new: true }
    );

    res.status(201).json({
      ...savedAdmission.toObject(),
      assignedRoom: {
        _id: availableRoom._id,
        roomNumber: availableRoom.roomNumber,
        unit: availableRoom.unit,
        roomType: availableRoom.roomType,
        capacity: availableRoom.capacity,
        occupiedBeds: availableRoom.occupiedBeds
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
      patientName: adm.patientId?.name || '—',
      mrn: adm.patientId?.mrn || '—',
      roomNumber: adm.room?.roomNumber || '—',
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
