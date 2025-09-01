const Room = require('../models/Room');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');

//create room
const createRoom = async (req, res) => {
  try {

    if (!req.scopeFilter?.clinic) {
      return res.status(403).json({ error: "You don't have a clinic scope to create a room." });
    }

    const roomData = { ...req.body } ;

    // Enforce scopeFilter 
    if (req.scopeFilter?.clinic) {
      roomData.clinic = req.scopeFilter.clinic;
    }
    if (req.scopeFilter?.organizationId) {
      roomData.organizationId = req.scopeFilter.organizationId;
    }

    const room = new Room(roomData);
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