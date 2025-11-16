const { Room, Patient, Admission, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

//Create a new room
const createRoom = async (req, res) => {
  logger.info('POST /rooms endpoint hit');

  try {
    const { clinicId: bodyClinicId } = req.body;
    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;
    const userEmail = req.user?.email || 'unknown';

    logger.info(`[createRoom] Incoming request to create room received from user: ${userEmail}`);

    if (!userOrgId) {
      logger.warn('[createRoom] Missing organizationId in user context');
      return res.status(403).json({ error: 'Missing organizationId in user context' });
    }

    let clinicId;

    //for admin role
    if (role === 'admin') {
      if (!bodyClinicId) {
        logger.warn('[createRoom] Admin did not provide clinicId');
        return res.status(400).json({ error: 'Admin must provide clinicId' });
      }

      const clinic = await Clinic.findOne({
        where: { clinicId: bodyClinicId, organizationId: userOrgId },
      });

      if (!clinic) {
        logger.warn(`[createRoom] Clinic not found for clinicId=${bodyClinicId}, orgId=${userOrgId}`);
        return res.status(404).json({ error: 'Clinic not found' });
      }

      clinicId = clinic.clinicId;
      logger.debug(`[createRoom] Admin assigned clinicId=${clinicId}`);

    //for manager role
    } else if (role === 'manager') {
      if (!userClinicId) {
        logger.warn('[createRoom] Manager has no clinic assignment');
        return res.status(403).json({ error: 'Manager has no clinic assignment' });
      }

      const clinic = await Clinic.findByPk(userClinicId);
      if (!clinic) {
        logger.warn(`[createRoom] Assigned clinic not found for clinicId=${userClinicId}`);
        return res.status(404).json({ error: 'Assigned clinic not found' });
      }

      clinicId = clinic.clinicId;

    //for other roles
    } else {
      logger.warn(`[createRoom] Unauthorized role: ${role}`);
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    //create room
    const room = await Room.create({
      ...req.body,
      organizationId: userOrgId,
      clinicId,
    });

    logger.info(`[createRoom] Room created successfully (roomId=${room.id}, clinicId=${clinicId})`);
    res.status(201).json(room);

  } catch (err) {
    logger.error(`[createRoom] Error in createRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//GET all rooms
const getRooms = async (req, res) => {
  
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[getRooms] Incoming request to view all room received from user: ${userEmail}`);

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

    logger.info('[getRooms] Successfully fetched and enriched all room data');
    res.json(enrichedRooms);

  } catch (err) {
    logger.error(`[getRooms] Error in getRooms: ${err.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//Get room by id
const getRoomById = async (req, res) => {
  
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[getRoomsById] Incoming request to view a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`[getRoomsById] Room query filter: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });

    if (!room) {
      logger.warn(`[getRoomsById] Room not found with id=${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    logger.info(`[getRoomsById] Room found: id=${room.id}, roomNumber=${room.roomNumber}`);
    res.json(room);

  } catch (err) {
    logger.error(`[getRoomsById] Error in getRoomById: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};


//GET available rooms
const getAvailableRooms = async (req, res) => {
  
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[getAvailableRooms] Incoming request to view all available rooms received from user: ${userEmail}`);

  try {
    const { unit, roomType } = req.query; 
    const scopeFilter = req.scopeFilter || {};
    const roomFilter = { ...scopeFilter };

    if (unit) roomFilter.unit = unit;
    if (roomType) roomFilter.roomType = roomType;


    //Fetch rooms
    const rooms = await Room.findAll({ where: roomFilter });
    logger.info(`[getAvailableRooms] Fetched ${rooms.length} rooms from DB`);

    if (rooms.length === 0) {
      logger.warn('[getAvailableRooms] No rooms found for given filter');
      return res.json([]);
    }

    //Get active admissions for those rooms
    const roomIds = rooms.map(r => r.id);
    logger.debug(`[getAvailableRooms] Room IDs to check admissions: [${roomIds.join(', ')}]`);

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

    logger.info(`[getAvailableRooms] Fetched active admissions for ${activeAdmissions.length} rooms`);

    //build occupancy map
    const occupancyMap = {};
    activeAdmissions.forEach(a => {
      occupancyMap[a.room] = parseInt(a.count) || 0;
    });

    //add availability info
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

    logger.info(`[getAvailableRooms] Successfully enriched ${enrichedRooms.length} rooms with availability data`);
    res.json(enrichedRooms);

  }  catch (err) {
  logger.error(`[getAvailableRooms] Error in getting available rooms: ${err.message}`);
  if (err.original) {
    logger.error(`SQL Error Detail: ${err.original.detail || 'No detail'}`);
    logger.error(`SQL Error Hint: ${err.original.hint || 'No hint'}`);
    logger.error(`SQL Error SQL: ${err.original.sql || 'No SQL logged'}`);
  }
  logger.error(err.stack);
  res.status(500).json({ error: "Server error while fetching available rooms" });
  }

};


//Update room
const updateRoom = async (req, res) => {
  
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[updateRoom] Incoming request to update a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`[updateRoom] Update room query: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`[updateRoom] Room not found for ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.update(req.body);
    logger.info(`[updateRoom] Room ${req.params.id} updated successfully`);
    res.json(room);

  } catch (err) {
    logger.error(`[updateRoom] Error in updateRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};


//Delete room
const deleteRoom = async (req, res) => {
  
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[deleteRoom] Incoming request to delete a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`[deleteRoom] Room not found for deletion: ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.destroy();
    logger.info(`[deleteRoom] Room ${req.params.id} deleted successfully`);
    res.json({ message: 'Room deleted successfully' });

  } catch (err) {
    logger.error(`[deleteRoom] Error in deleteRoom: ${err.stack}`);
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
