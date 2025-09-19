const Room = require('../models/Room');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');

//create room
const createRoom = async (req, res) => {
  try {
    const { clinicId: bodyClinicId } = req.body;
    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    console.log(req.body);

    let clinicId;
    if (role === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }
      clinicId = bodyClinicId;
    } else if (role === "manager") {
      if (!userClinicId) {
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }
      clinicId = userClinicId;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const room = new Room({
      ...req.body,
      organizationId: userOrgId,
      clinicId,
    });

    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



//get all rooms
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find(req.scopeFilter);

    const roomStatuses = await Promise.all(
      rooms.map(async (room) => {
        // Find all active admissions for this room
        const admissions = await Admission.find({
          room: room._id,
          status: 'Active'
        }).populate('patientId');

        // Count only real admissions
        const occupancyCount = admissions.length;

        // List patients
        const occupants = admissions
          .map(ad => ad.patientId?.name)
          .filter(Boolean);


        return {
          ...room.toObject(),
          occupants,  
          occupancy: `${occupancyCount}/${room.capacity}`
        };
      })
    );
    res.json(roomStatuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//get room by id
const getRoomById = async (req, res) => {
  try {
    const query = { _id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOne(query);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//update room
const updateRoom = async (req, res) => {
  try {
    const query = { _id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOneAndUpdate(query, req.body, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//delete room
const deleteRoom = async (req, res) => {
  try {
    const query = { _id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOneAndDelete(query);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
};