const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    calBookingId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },

    clinicId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Clinic',
        key: 'id'
      }
    },

    organizationId: {
      type: DataTypes.UUID,
      allowNull: false
      // add FK reference if you have an Organization table
    },

    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM(
        'scheduled',
        'cancelled',
        'rescheduled',
        'completed'
      ),
      allowNull: false,
      defaultValue: 'scheduled'
    }
  }, {
    tableName: 'Appointments',
    timestamps: true,
    indexes: [
      { fields: ['calBookingId'], unique: true },
      { fields: ['patientId'] },
      { fields: ['clinicId'] },
      { fields: ['organizationId'] },
      { fields: ['startTime'] }
    ]
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });

    Appointment.belongsTo(models.Clinic, {
      foreignKey: 'clinicId',
      as: 'clinic'
    });

    Appointment.belongsTo(models.Organization, {
       foreignKey: 'organizationId',
       as: 'organization'
     });
  };

  return Appointment;
};
