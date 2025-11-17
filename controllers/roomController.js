const { Room, Patient, Admission, Clinic, Organization } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new room
const createRoom = async (req, res) => {
  const endpoint = 'createRoom';
  const userEmail = req.user?.email || 'unknown';
  const { clinicId: bodyClinicId } = req.body;
  const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;
    
  logger.info(`[${endpoint}] Incoming request to create room from user: ${userEmail}`);

  try {

    if (!userOrgId) {
      logger.warn('[${endpoint}] Missing organizationId in user context');
      return res.status(403).json({ error: 'Missing organizationId in user context' });
    }

    let clinicId;

    //for admin role
    if (role === 'admin') {
      if (!bodyClinicId) {
        logger.warn('[${endpoint}] Admin did not provide clinicId');
        return res.status(400).json({ error: 'Admin must provide clinicId' });
      }

      const clinic = await Clinic.findOne({
        where: {
          organizationId: userOrgId,
          //handles both clinicId and id lookup
          [Op.or]: [
            { clinicId: bodyClinicId },  
            { id: bodyClinicId }         
          ]
        }
      });

      if (!clinic) {
        logger.warn(`[${endpoint}] Clinic not found for clinicId=${bodyClinicId}, orgId=${userOrgId}`);
        return res.status(404).json({ error: 'Clinic not found' });
      }

      clinicId = clinic.clinicId;
      logger.debug(`[${endpoint}] Admin assigned clinicId=${clinicId}`);

    //for manager role
    } else if (role === 'manager') {
      if (!userClinicId) {
        logger.warn(`[${endpoint}] Manager has no clinic assignment`);
        return res.status(403).json({ error: 'Manager has no clinic assignment' });
      }

      const clinic = await Clinic.findByPk(userClinicId);
      if (!clinic) {
        logger.warn(`[${endpoint}] Assigned clinic not found for clinicId=${userClinicId}`);
        return res.status(404).json({ error: 'Assigned clinic not found' });
      }

      clinicId = clinic.clinicId;

    //for other roles
    } else {
      logger.warn(`[${endpoint}] Unauthorized role: ${role}`);
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    //create room
    const room = await Room.create({
      ...req.body,
      organizationId: userOrgId,
      clinicId,
    });

    logger.info(`[${endpoint}] Room created successfully (roomId=${room.id}, clinicId=${clinicId})`);
    res.status(201).json(room);

  } catch (err) {
    logger.error(`[${endpoint}] Error in createRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//GET all rooms
const getRooms = async (req, res) => {
  const endpoint = 'getRooms';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to view all room received from user: ${userEmail}`);

  try {
    const scope = req.scopeFilter || {};

    const rooms = await Room.findAll({ where: scope });

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

        logger.debug(`[${endpoint}] Room ${room.roomNumber}: ${occupiedBeds}/${room.capacity} beds occupied`);

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

    logger.info(`[${endpoint}] Successfully fetched and enriched all room data`);
    res.json(enrichedRooms);

  } catch (err) {
    logger.error(`[${endpoint}] Error in getRooms: ${err.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};


//Get room by id
const getRoomById = async (req, res) => {
  const endpoint = 'getRoomById';
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[${endpoint}] Incoming request to view a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };

    const room = await Room.findOne({ where: query });

    if (!room) {
      logger.warn(`[${endpoint}] Room not found with id=${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    logger.info(`[${endpoint}] Room found: id=${room.id}, roomNumber=${room.roomNumber}`);
    res.json(room);

  } catch (err) {
    logger.error(`[${endpoint}] Error in getRoomById: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};


//GET available rooms
const getAvailableRooms = async (req, res) => {
  const endpoint = 'getAvailableRooms';
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[${endpoint}] Incoming request to view all available rooms received from user: ${userEmail}`);

  try {
    const { unit, roomType } = req.query; 
    const scopeFilter = req.scopeFilter || {};
    const roomFilter = { ...scopeFilter };

    if (unit) roomFilter.unit = unit;
    if (roomType) roomFilter.roomType = roomType;


    //Fetch rooms
    const rooms = await Room.findAll({ where: roomFilter });

    if (rooms.length === 0) {
      logger.warn('[${endpoint}] No rooms found for given filter');
      return res.json([]);
    }

    //Get active admissions for those rooms
    const roomIds = rooms.map(r => r.id);
    logger.debug(`[${endpoint}] Room IDs to check admissions: [${roomIds.join(', ')}]`);

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

    logger.info(`[${endpoint}] Fetched active admissions for ${activeAdmissions.length} rooms`);

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

    logger.info(`[${endpoint}] Successfully enriched ${enrichedRooms.length} rooms with availability data`);
    res.json(enrichedRooms);

  }  catch (err) {
  logger.error(`[${endpoint}] Error in getting available rooms: ${err.message}`);
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
  const endpoint = 'updateRoom';
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[${endpoint}] Incoming request to update a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };
    logger.debug(`[${endpoint}] Update room query: ${JSON.stringify(query)}`);

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`[${endpoint}] Room not found for ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.update(req.body);
    logger.info(`[${endpoint}] Room ${req.params.id} updated successfully`);
    res.json(room);

  } catch (err) {
    logger.error(`[${endpoint}] Error in updateRoom: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};


//Delete room
const deleteRoom = async (req, res) => {
  const endpoint = 'deleteRoom';
  const userEmail = req.user?.email || 'unknown';
  logger.info(`[${endpoint}] Incoming request to delete a room having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const query = { id: req.params.id, ...req.scopeFilter };

    const room = await Room.findOne({ where: query });
    if (!room) {
      logger.warn(`[${endpoint}] Room not found for deletion: ID ${req.params.id}`);
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.destroy();
    logger.info(`[${endpoint}] Room ${req.params.id} deleted successfully`);
    res.json({ message: 'Room deleted successfully' });

  } catch (err) {
    logger.error(`[${endpoint}] Error in deleteRoom: ${err.stack}`);
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
