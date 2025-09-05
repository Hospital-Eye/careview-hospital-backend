const Staff = require('../models/Staff');

// Create new staff
const createStaff = async (req, res) => {
  try {
    // Destructure the request body to exclude _id
    const { _id, ...staffData } = req.body;

    // Check if required fields are present
    if (!staffData.clinicId || !staffData.organizationId) {
      return res.status(400).json({ error: 'clinic and organization are required.' });
    }

    // Create a new staff document using the sanitized data
    const staff = new Staff(staffData);

    // Save the document to the database
    await staff.save();

    // Respond with the new staff document
    res.status(201).json(staff);
  } catch (err) {
    // Handle validation or other errors
    res.status(400).json({ error: err.message });
  }
};

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get one staff
const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createStaff, getAllStaff, getStaffById, updateStaff, deleteStaff };
