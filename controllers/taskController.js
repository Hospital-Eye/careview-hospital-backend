const { Task } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

// --- Create a new task ---
const createTask = async (req, res) => {
  try {
    logger.info(`📝 [createTask] Request received from user=${req.user?.email || 'unknown'}`);
    logger.debug(`📦 [createTask] Request body: ${JSON.stringify(req.body)}`);

    const { taskType, patientId, description, assignedStaffId, clinicId: bodyClinicId, ...otherFields } = req.body;

    // ✅ Basic validations
    if (!description) {
      logger.warn(`⚠️ [createTask] Missing description field`);
      return res.status(400).json({ error: "Description is required." });
    }

    if (taskType === "Patient-Related" && !patientId) {
      logger.warn(`⚠️ [createTask] Missing patientId for patient-related task`);
      return res.status(400).json({ error: "Patient ID is required for patient-related tasks." });
    }

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      logger.error(`❌ [createTask] Missing organizationId in user context`);
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinicId;
    if (role === "admin") {
      if (!bodyClinicId) {
        logger.warn(`⚠️ [createTask] Admin did not provide clinicId`);
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }
      clinicId = bodyClinicId;
    } else if (role === "manager") {
      if (!userClinicId) {
        logger.error(`❌ [createTask] Manager has no assigned clinic`);
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }
      clinicId = userClinicId;
    } else {
      logger.error(`🚫 [createTask] Unauthorized role=${role}`);
      return res.status(403).json({ error: "Unauthorized role" });
    }

    // ✅ Create the task
    const task = await Task.create({
      taskType,
      description,
      patientId: taskType === "Patient-Related" ? patientId : null,
      clinicId,
      organizationId: userOrgId,
      assignedStaffId: assignedStaffId || req.user.id,
      timestamps: {
        created: new Date(),
        due: otherFields.due || null,
      },
      ...otherFields,
    });

    logger.info(`✅ [createTask] Task created successfully: id=${task.id}, clinicId=${clinicId}, createdBy=${req.user?.email}`);
    res.status(201).json(task);
  } catch (err) {
    logger.error(`❌ [createTask] Error creating task: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// --- Get all tasks ---
const getTasks = async (req, res) => {
  try {
    logger.info(`📥 [getTasks] Request received from user=${req.user?.email || 'unknown'}`);
    logger.debug(`🔎 [getTasks] Query params: ${JSON.stringify(req.query)}`);

    const scopeFilter = req.scopeFilter || {};
    const query = { ...scopeFilter };

    if (req.query.taskType) query.taskType = req.query.taskType;
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const tasks = await Task.findAll({
      where: query,
      include: [
        { model: require('../models').Staff, as: 'assignedStaff', attributes: ['name', 'role', 'contact'] },
        { model: require('../models').Patient, as: 'patient', attributes: ['name', 'mrn'] }
      ]
    });

    logger.info(`✅ [getTasks] Retrieved ${tasks.length} tasks for user=${req.user?.email}`);
    res.json(tasks);
  } catch (err) {
    logger.error(`❌ [getTasks] Error fetching tasks: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// --- Get single task by ID ---
const getTaskById = async (req, res) => {
  try {
    logger.info(`📥 [getTaskById] Request received from user=${req.user?.email || 'unknown'} for taskId=${req.params.id}`);

    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: require('../models').Staff, as: 'assignedStaff' },
        { model: require('../models').Patient, as: 'patient' },
        { model: Task, as: 'dependencies' }
      ]
    });

    if (!task) {
      logger.warn(`⚠️ [getTaskById] Task not found: id=${req.params.id}`);
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info(`✅ [getTaskById] Task fetched successfully: id=${task.id}`);
    res.json(task);
  } catch (err) {
    logger.error(`❌ [getTaskById] Error fetching task by ID: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

// --- Update a task ---
const updateTask = async (req, res) => {
  try {
    logger.info(`✏️ [updateTask] Request received to update taskId=${req.params.id} by user=${req.user?.email || 'unknown'}`);
    logger.debug(`🧾 [updateTask] Update body: ${JSON.stringify(req.body)}`);

    const scopeFilter = req.scopeFilter || {};
    const task = await Task.findOne({
      where: { id: req.params.id, ...scopeFilter }
    });

    if (!task) {
      logger.warn(`⚠️ [updateTask] Task not found or not accessible: id=${req.params.id}`);
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update(req.body);
    logger.info(`✅ [updateTask] Task updated successfully: id=${task.id}`);
    res.json(task);
  } catch (err) {
    logger.error(`❌ [updateTask] Error updating task: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

// --- Delete a task ---
const deleteTask = async (req, res) => {
  try {
    logger.info(`🗑️ [deleteTask] Request received to delete taskId=${req.params.id} by user=${req.user?.email || 'unknown'}`);

    const scopeFilter = req.scopeFilter || {};
    const deleted = await Task.destroy({
      where: { id: req.params.id, ...scopeFilter }
    });

    if (!deleted) {
      logger.warn(`⚠️ [deleteTask] Task not found or not accessible: id=${req.params.id}`);
      return res.status(404).json({ error: "Task not found or not accessible" });
    }

    logger.info(`✅ [deleteTask] Task deleted successfully: id=${req.params.id}`);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    logger.error(`❌ [deleteTask] Error deleting task: ${err.message}`, { stack: err.stack });
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
