const User = require('../models/User');

const createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getUsers = async (req, res) => {
    try {
      const users = await User.find(); // Get all users from MongoDB
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  };

module.exports = { createUser, getUsers };
