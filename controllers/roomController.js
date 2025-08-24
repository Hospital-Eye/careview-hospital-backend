const Room = require('../models/Room');

const createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const Patient = require('../models/Patient');
const Admission = require('../models/Admissions');

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    // For each room, check if occupied and get patient name
    const roomStatuses = await Promise.all(rooms.map(async (room) => {
      // Find active admission for this room
      const admission = await Admission.findOne({ assignedRoomId: room._id, status: 'Active' }).populate('patientId');
      if (admission && admission.patientId && admission.patientId.name) {
        return {
          ...room.toObject(),
          occupant: admission.patientId.name
        };
      } else {
        return {
          ...room.toObject(),
          occupant: 'Available'
        };
      }
    }));
    res.json(roomStatuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
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