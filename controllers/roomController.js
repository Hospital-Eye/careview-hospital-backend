const { Room, Patient, Admission, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

//create room
const createRoom = async (req, res) => {
  try {
    const { clinicId: bodyClinicId } = req.body;
    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    console.log(req.body);

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinicId;

    if (role === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }

      const clinic = await Clinic.findOne({
        where: {
          clinicId: bodyClinicId,
          organizationId: userOrgId,
        }
      });

      if (!clinic) {
        return res.status(404).json({ error: "Clinic not found" });
      }

      clinicId = clinic.clinicId;
    } else if (role === "manager") {
      if (!userClinicId) {
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }

      const clinic = await Clinic.findByPk(userClinicId);
      if (!clinic) {
        return res.status(404).json({ error: "Assigned clinic not found" });
      }

      clinicId = clinic.clinicId;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    // Save room with normalized clinicId
    const room = await Room.create({
      ...req.body,
      organizationId: userOrgId,
      clinicId,
    });

    res.status(201).json(room);
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(400).json({ error: err.message });
  }
};

// Get all rooms with dynamic occupancy info
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({ where: req.scopeFilter || {} });

    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        // Find active admissions for this room
        const admissions = await Admission.findAll({
          where: {
            room: room.id,
            status: 'Active'
          },
          include: [{
            model: Patient,
            as: 'patient',
            attributes: ['name']
          }]
        });

        const occupiedBeds = admissions.length;
        const occupants = admissions
          .map(ad => ad.patient?.name)
          .filter(Boolean);

        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          organizationId: room.organizationId,
          clinicId: room.clinicId,
          unit: room.unit,
          roomType: room.roomType,
          capacity: room.capacity,
          occupiedBeds,
          occupants,
          isAvailable: occupiedBeds < room.capacity
        };
      })
    );

    res.json(enrichedRooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: err.message });
  }
};


//get room by id
const getRoomById = async (req, res) => {
  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOne({ where: query });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAvailableRooms = async (req, res) => {
  try {
    const { unit, roomType } = req.query; // optional filters

    // Base filter (scoped to org/clinic)
    const scopeFilter = req.scopeFilter || {};
    const roomFilter = { ...scopeFilter };

    if (unit) roomFilter.unit = unit;
    if (roomType) roomFilter.roomType = roomType;

    // Fetch rooms
    const rooms = await Room.findAll({ where: roomFilter });

    // For each room, count active admissions
    const roomIds = rooms.map(r => r.id);

    const activeAdmissions = await Admission.findAll({
      where: {
        roomId: { [Op.in]: roomIds },
        status: "Active"
      },
      attributes: [
        'roomId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['roomId'],
      raw: true
    });

    // Map roomId → occupancy count
    const occupancyMap = {};
    activeAdmissions.forEach(a => {
      occupancyMap[a.roomId] = parseInt(a.count) || 0;
    });

    // Add availability info
    const enrichedRooms = rooms.map(room => {
      const roomData = room.get({ plain: true });
      const occupied = occupancyMap[roomData.id] || 0;
      const availableBeds = roomData.capacity - occupied;
      return {
        ...roomData,
        occupied,
        availableBeds,
        isAvailable: availableBeds > 0
      };
    });

    res.json(enrichedRooms);
  } catch (err) {
    console.error("Error fetching available rooms:", err);
    res.status(500).json({ error: "Server error while fetching available rooms" });
  }
};

//update room
const updateRoom = async (req, res) => {
  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOne({ where: query });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    await room.update(req.body);
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//delete room
const deleteRoom = async (req, res) => {
  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    const room = await Room.findOne({ where: query });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    await room.destroy();
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  getAvailableRooms,
  updateRoom,
  deleteRoom
};
