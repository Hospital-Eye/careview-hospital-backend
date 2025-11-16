const { User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new user session
const createUser = async (req, res) => {
  const endpoint = 'createUser';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Incoming request to create a new user from user: ${userEmail}`);

  try {
    const user = await User.create(req.body);
    logger.info(`[${endpoint}] User created successfully with ID=${user.id}`);
    res.status(201).json(user);
  } catch (err) {
    logger.error(`[${endpoint}] Error creating user: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Get all user sessions
const getUsers = async (req, res) => {
  const endpoint = 'getUsers';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all users received from user: ${userEmail}`);

  try {
    const users = await User.findAll();
    logger.info(`[${endpoint}] Fetched ${users.length} users from database`);
    res.json(users);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching users: ${err.stack}`);
    res.status(500).json({ error: 'Server error' });
  }
};

//Update a user session by ID
const updateUser = async (req, res) => {
  const endpoint = 'updateUser';
  const id = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to update user having id: ${id} received from user: ${userEmail}`);
  
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      logger.warn(`[${endpoint}] User not found for ID=${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(req.body);
    logger.info(`[${endpoint}] User updated successfully (ID=${id})`);
    res.json(user);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating user ID=${req.params.id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Delete a user session by ID
const deleteUser = async (req, res) => {
  const endpoint = 'deleteUser';
  const id = req.params.id;
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to delete user having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const deleted = await User.destroy({ where: { id: id } });
    if (!deleted) {
      logger.warn(`[${endpoint}] Attempted to delete user, but not found (ID=${id})`);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`[${endpoint}] User deleted successfully (ID=${id})`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting user ID=${id}: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
};
