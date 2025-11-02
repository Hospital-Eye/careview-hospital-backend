const { Room, Patient, Admission, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

//create room
const createRoom = async (req, res) => {
  logger.info('POST /rooms endpoint hit');

  try {
    const { clinicId: bodyClinicId } = req.body;
    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    logger.debug(`Request body: ${JSON.stringify(req.body)}`);
    logger.debug(`User context: role=${role}, orgId=${userOrgId}, clinicId=${userClinicId}`);

    if (!userOrgId) {
      logger.warn('Missing organizationId in user context');
      return res.status(403).json({ error: 'Missing organizationId in user context' });
    }

    let clinicId;

    // --- Admin Role ---
    if (role === 'admin') {
      if (!bodyClinicId) {
        logger.warn('Admin did not provide clinicId');
        return res.status(400).json({ error: 'Admin must provide clinicId' });
      }

      const clinic = await Clinic.findOne({
        where: { clinicId: bodyClinicId, organizationId: userOrgId },
      });

      if (!clinic) {
        logger.warn(`Clinic not found for clinicId=${bodyClinicId}, orgId=${userOrgId}`);
        return res.status(404).json({ error: 'Clinic not found' });
      }

      clinicId = clinic.clinicId;
      logger.debug(`Admin assigned clinicId=${clinicId}`);

    // --- Manager Role ---
    } else if (role === 'manager') {
      if (!userClinicId) {
        logger.warn('Manager has no clinic assignment');
        return res.status(403).json({ error: 'Manager has no clinic assignment' });
      }

      const clinic = await Clinic.findByPk(userClinicId);
      if (!clinic) {
        logger.warn(`Assigned clinic not found for clinicId=${userClinicId}`);
        return res.status(404).json({ error: 'Assigned clinic not found' });
      }

      clinicId = clinic.clinicId;
      logger.debug(`Manager assigned clinicId=${clinicId}`);

    // --- Other Roles ---
    } else {
      logger.warn(`Unauthorized role: ${role}`);
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // --- Create Room ---
    const room = await Room.create({
      ...req.body,
      organizationId: userOrgId,
      clinicId,
    });

    logger.info(`✅ Room created successfully (roomId=${room.id}, clinicId=${clinicId})`);
    res.status(201).json(room);

  } catch (err) {
    logger.error(`Error in createRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//GET all rooms
const getRooms = async (req, res) => {
  logger.info('GET /rooms endpoint hit');

  try {
    const scope = req.scopeFilter || {};
    logger.debug(`Room query filter: ${JSON.stringify(scope)}`);

    const rooms = await Room.findAll({ where: scope });
    logger.debug(`Fetched ${rooms.length} rooms from database`);

    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
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

        logger.debug(
          `Room ${room.roomNumber}: ${occupiedBeds}/${room.capacity} beds occupied`
        );

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

    logger.info('✅ Successfully fetched and enriched all room data');
    res.json(enrichedRooms);

  } catch (err) {
    logger.error(`Error in getRooms: ${err.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//get room by id
const getRoomById = async (req, res) => {
  logger.info(`GET /rooms/${req.params.id} endpoint hit`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`Room query filter: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });

    if (!room) {
      logger.warn(`Room not found with id=${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    logger.info(`✅ Room found: id=${room.id}, roomNumber=${room.roomNumber}`);
    res.json(room);

  } catch (err) {
    logger.error(`Error in getRoomById: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};


//GET available rooms
const getAvailableRooms = async (req, res) => {
  logger.info('GET /rooms/available endpoint hit');

  try {
    const { unit, roomType } = req.query; // optional filters
    const scopeFilter = req.scopeFilter || {};
    const roomFilter = { ...scopeFilter };

    if (unit) roomFilter.unit = unit;
    if (roomType) roomFilter.roomType = roomType;

    logger.debug(`Room filter applied: ${JSON.stringify(roomFilter)}`);

    // Fetch rooms
    const rooms = await Room.findAll({ where: roomFilter });
    logger.info(`Fetched ${rooms.length} rooms from DB`);

    if (rooms.length === 0) {
      logger.warn('No rooms found for given filter');
      return res.json([]);
    }

    // Get active admissions for those rooms
    const roomIds = rooms.map(r => r.id);
    logger.debug(`Room IDs to check admissions: [${roomIds.join(', ')}]`);

    const activeAdmissions = await Admission.findAll({
      where: {
        room: { [Op.in]: roomIds },
        status: "Active"
      },
      attributes: [
        'room',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['room'],
      raw: true
    });

    logger.info(`Fetched active admissions for ${activeAdmissions.length} rooms`);

    // Build occupancy map
    const occupancyMap = {};
    activeAdmissions.forEach(a => {
      occupancyMap[a.room] = parseInt(a.count) || 0;
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

    logger.info(`✅ Successfully enriched ${enrichedRooms.length} rooms with availability data`);
    res.json(enrichedRooms);

  }  catch (err) {
  logger.error(`❌ Error in getAvailableRooms: ${err.message}`);
  if (err.original) {
    logger.error(`📄 SQL Error Detail: ${err.original.detail || 'No detail'}`);
    logger.error(`📘 SQL Error Hint: ${err.original.hint || 'No hint'}`);
    logger.error(`📜 SQL Error SQL: ${err.original.sql || 'No SQL logged'}`);
  }
  logger.error(err.stack);
  res.status(500).json({ error: "Server error while fetching available rooms" });
  }

};


//update room
const updateRoom = async (req, res) => {
  logger.info(`PUT /rooms/${req.params.id} endpoint hit`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`Update room query: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`Room not found for ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.update(req.body);
    logger.info(`Room ${req.params.id} updated successfully`);
    res.json(room);

  } catch (err) {
    logger.error(`Error in updateRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};


//delete room
const deleteRoom = async (req, res) => {
  logger.info(`DELETE /rooms/${req.params.id} endpoint hit`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`Delete room query: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`Room not found for deletion: ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.destroy();
    logger.info(`Room ${req.params.id} deleted successfully`);
    res.json({ message: 'Room deleted successfully' });

  } catch (err) {
    logger.error(`Error in deleteRoom: ${err.stack}`);
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
