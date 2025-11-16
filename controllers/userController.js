const { User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new user session
const createUser = async (req, res) => {
  logger.info('POST /users endpoint hit');
  logger.debug(`Request body: ${JSON.stringify(req.body)}`);

  try {
    const user = await User.create(req.body);
    logger.info(`User created successfully with ID=${user.id}`);
    res.status(201).json(user);
  } catch (err) {
    logger.error(`Error creating user: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Get all user sessions
const getUsers = async (req, res) => {
  logger.info('GET /users endpoint hit');

  try {
    const users = await User.findAll();
    logger.info(`Fetched ${users.length} users from database`);
    res.json(users);
  } catch (err) {
    logger.error(`Error fetching users: ${err.stack}`);
    res.status(500).json({ error: 'Server error' });
  }
};

//Update a user session by ID
const updateUser = async (req, res) => {
  logger.info(`PUT /users/${req.params.id} endpoint hit`);
  logger.debug(`Update data: ${JSON.stringify(req.body)}`);

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      logger.warn(`User not found for ID=${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(req.body);
    logger.info(`User updated successfully (ID=${user.id})`);
    res.json(user);
  } catch (err) {
    logger.error(`Error updating user ID=${req.params.id}: ${err.stack}`);
    res.status(400).json({ error: err.message });
  }
};

//Delete a user session by ID
const deleteUser = async (req, res) => {
  logger.info(`DELETE /users/${req.params.id} endpoint hit`);

  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      logger.warn(`Attempted to delete user, but not found (ID=${req.params.id})`);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User deleted successfully (ID=${req.params.id})`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error(`Error deleting user ID=${req.params.id}: ${err.stack}`);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
};
