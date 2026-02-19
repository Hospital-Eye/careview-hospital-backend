const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    booking_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    patient_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },

    clinicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    organizationId: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    scheduledBy: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'portal',
    },

    attendeeEmail: DataTypes.STRING,
    pendingIdentity: DataTypes.BOOLEAN,

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'scheduled'
    }
  }, {
    tableName: 'Appointment',
    timestamps: true,
    indexes: [
      // Use actual column names (snake_case) that are defined in the model
      { fields: ['booking_id'], unique: true },
      { fields: ['patient_id'] },
      { fields: ['clinicId'] },
      { fields: ['organizationId'] },
      { fields: ['startTime'] },
      { fields: ['endTime'] },
      { fields: ['scheduledBy'] },
      { fields: ['status'] }
    ]
  });

  Appointment.associate = (models) => {
    // Associations should reference the actual foreign key column names
    Appointment.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

  };

  return Appointment;
};
