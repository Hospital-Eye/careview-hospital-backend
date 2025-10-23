const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Staff = sequelize.define('Staff', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contact: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    shift: {
      type: DataTypes.STRING,
      allowNull: true
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    specializations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('On-Duty', 'Off-Duty', 'Leave'),
      allowNull: false,
      defaultValue: 'On-Duty'
    }
  }, {
    tableName: 'Staff',
    timestamps: true,
    indexes: [
      { fields: ['employeeId'], unique: true },
      { fields: ['userId'] },
      { fields: ['organizationId'] },
      { fields: ['clinicId'] }
    ]
  });

  Staff.associate = (models) => {
    Staff.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Staff.hasMany(models.Admission, {
      foreignKey: 'admittedByStaffId',
      as: 'admittedAdmissions'
    });
    Staff.hasMany(models.Admission, {
      foreignKey: 'attendingPhysicianId',
      as: 'attendingAdmissions'
    });
    Staff.hasMany(models.Task, {
      foreignKey: 'assignedStaffId',
      as: 'assignedTasks'
    });
    Staff.hasMany(models.Vital, {
      foreignKey: 'recordedBy',
      as: 'recordedVitals'
    });
  };

  return Staff;
};
