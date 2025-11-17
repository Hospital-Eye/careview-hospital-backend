const { Task } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//Create a new task 
const createTask = async (req, res) => {
  try {
    const endpoint = 'createTask';
    const userEmail = req.user?.email || 'unknown';

    const { taskType, patientId, description, assignedStaffId, clinicId: bodyClinicId, ...otherFields } = req.body;

    logger.info(`[${endpoint}] Incoming request to create task from user: ${userEmail}`);

    if (!description) {
      logger.warn(`[${endpoint}] Missing description field`);
      return res.status(400).json({ error: "Description is required." });
    }

    if (taskType === "Patient-Related" && !patientId) {
      logger.warn(`[${endpoint}] Missing patientId for patient-related task`);
      return res.status(400).json({ error: "Patient ID is required for patient-related tasks." });
    }

    const { role, organizationId: userOrgId, clinicId: userClinicId } = req.user;

    if (!userOrgId) {
      logger.error(`[${endpoint}] Missing organizationId in user context: ${userEmail}`);
      return res.status(403).json({ error: "Missing organizationId in user context" });
    }

    let clinicId;
    if (role === "admin") {
      if (!bodyClinicId) {
        logger.warn(`[${endpoint}] Admin did not provide clinicId`);
        return res.status(400).json({ error: "Admin must provide clinicId" });
      }
      clinicId = bodyClinicId;
    } else if (role === "manager") {
      if (!userClinicId) {
        logger.error(`[${endpoint}] Manager has no assigned clinic`);
        return res.status(403).json({ error: "Manager has no clinic assignment" });
      }
      clinicId = userClinicId;
    } else {
      logger.error(`[${endpoint}] Unauthorized role=${role}`);
      return res.status(403).json({ error: "Unauthorized role" });
    }

    //create the task
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

    logger.info(`[${endpoint}] Task created successfully: id=${task.id}, clinicId=${clinicId}, createdBy=${req.user?.email}`);
    res.status(201).json(task);
  } catch (err) {
    logger.error(`[${endpoint}] Error creating task: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Get all tasks
const getTasks = async (req, res) => {
  const endpoint = 'getTasks';
  const userEmail = req.user?.email || 'unknown';

  logger.info(`[${endpoint}] Request to view all tasks received from user: ${userEmail}`);

  try {
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

    logger.info(`[${endpoint}] Retrieved ${tasks.length} tasks for user=${req.user?.email}`);
    res.json(tasks);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching tasks: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

//get single task by ID
const getTaskById = async (req, res) => {
  const endpoint = 'getTaskById';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to view task having id: ${id} received from user: ${userEmail}`);

  try {
    logger.info(`[${endpoint}] Request received from user=${req.user?.email || 'unknown'} for taskId=${id}`);

    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: require('../models').Staff, as: 'assignedStaff' },
        { model: require('../models').Patient, as: 'patient' },
        { model: Task, as: 'dependencies' }
      ]
    });

    if (!task) {
      logger.warn(`[${endpoint}] Task not found: id=${id}`);
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info(`[${endpoint}] Task fetched successfully: id=${task.id}`);
    res.json(task);
  } catch (err) {
    logger.error(`[${endpoint}] Error fetching task by ID: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: err.message });
  }
};

//Update a task
const updateTask = async (req, res) => {

  const endpoint = 'updateTask';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to update task having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    
    const scopeFilter = req.scopeFilter || {};
    const task = await Task.findOne({
      where: { id: req.params.id, ...scopeFilter }
    });

    if (!task) {
      logger.warn(`[${endpoint}] Task not found or not accessible: id=${req.params.id}`);
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update(req.body);
    logger.info(`[${endpoint}] Task updated successfully: id=${task.id}`);
    res.json(task);
  } catch (err) {
    logger.error(`[${endpoint}] Error updating task: ${err.message}`, { stack: err.stack });
    res.status(400).json({ error: err.message });
  }
};

//Delete a task
const deleteTask = async (req, res) => {

  const endpoint = 'deleteTask';
  const userEmail = req.user?.email || 'unknown';
  const id = req.params.id;

  logger.info(`[${endpoint}] Request to delete task having id: ${req.params.id} received from user: ${userEmail}`);

  try {
    const scopeFilter = req.scopeFilter || {};
    const deleted = await Task.destroy({
      where: { id: req.params.id, ...scopeFilter }
    });

    if (!deleted) {
      logger.warn(`[${endpoint}] Task not found or not accessible: id=${id}`);
      return res.status(404).json({ error: "Task not found or not accessible" });
    }

    logger.info(`[${endpoint}] Task deleted successfully: id=${id}`);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    logger.error(`[${endpoint}] Error deleting task: ${err.message}`, { stack: err.stack });
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
