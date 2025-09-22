const Task = require('../models/Task');

// Create a new task
const createTask = async (req, res) => {
  try {
    const { category, patientId, description, assignedStaffId, clinicId: bodyClinicId, ...otherFields } = req.body;

    console.log(req.body);

    if (!description) {
      return res.status(400).json({ error: "Description is required." });
    }

    if (category === "Patient-Related" && !patientId) {
      return res.status(400).json({ error: "Patient ID is required for patient-related tasks." });
    }

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinicId;
    if (role === "admin") {
      if (!bodyClinicId) {
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }
      clinicId = bodyClinicId;
    } else if (role === "manager") {
      if (!userClinicId) {
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }
      clinicId = userClinicId;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const task = new Task({
      category,
      description,
      patientId: category === "Patient-Related" ? patientId : null,
      clinicId,
      organizationId: userOrgId,
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
    console.error("Error creating task:", err);
    res.status(400).json({ error: err.message });
  }
};

// Get all tasks
const getTasks = async (req, res) => {
  try {
    const scopeFilter = req.scopeFilter || {};
    const query = { ...scopeFilter }; // start with scope filter

    // Add URL params on top of scope
    if (req.query.taskType) {
      query.taskType = req.query.taskType;
    }

    const tasks = await Task.find(query)
      .populate('assignedStaffId', 'name role contact')
      .populate('patientId', 'name mrn')
      .populate('dependencies', 'taskType status');

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
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
