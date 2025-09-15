const Task = require('../models/Task');

// Create a new task
const createTask = async (req, res) => {
  try {
    const { category, patientId, description, assignedStaffId, ...otherFields } = req.body;

    // Prevent empty _id from crashing
    if (!otherFields._id) {
      delete otherFields._id;   
    }

    if (!description) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    // Patient-related tasks must include a patientId
    if (category === 'Patient-Related' && !patientId) {
      return res.status(400).json({ error: 'Patient ID is required for patient-related tasks.' });
    }

    const { clinicId, organizationId } = req.user;
    if (!clinicId || !organizationId) {
      return res.status(403).json({ error: 'User has no clinic/org assignment.' });
    }

    const task = new Task({
      category,
      description,
      patientId: category === 'Patient-Related' ? patientId : null,
      clinicId,
      organizationId,
      assignedStaffId: assignedStaffId || req.user.id,
      timestamps: {
        created: new Date(),
        due: otherFields.due || null,
      },
      ...otherFields,
    });

    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(400).json({ error: err.message });
  }
};


// Get all tasks
const getTasks = async (req, res) => {
    try {
        // Build a query object based on URL parameters
        const query = {};
        if (req.query.taskType) {
            query.taskType = req.query.taskType;
        }

        const tasks = await Task.find(query)
            .populate('assignedStaffId patientId dependencies');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single task by ID
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedStaffId patientId dependencies');
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update a task
const updateTask = async (req, res) => {
    try {
        const updated = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Task not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a task
const deleteTask = async (req, res) => {
    try {
        const deleted = await Task.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask
};
