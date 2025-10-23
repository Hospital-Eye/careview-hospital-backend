const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In-Progress', 'Completed', 'Overdue'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    taskType: {
      type: DataTypes.ENUM('Patient-Related', 'Operational'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Normal', 'High', 'Urgent'),
      allowNull: false,
      defaultValue: 'Normal'
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    assignedStaffId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Staff',
        key: 'id'
      }
    },
    timestamps: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    dependencies: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'Task',
    timestamps: true,
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['clinicId'] },
      { fields: ['assignedStaffId'] },
      { fields: ['patientId'] }
    ]
  });

  Task.associate = (models) => {
    Task.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Task.belongsTo(models.Staff, {
      foreignKey: 'assignedStaffId',
      as: 'assignedStaff'
    });
  };

  return Task;
};
