const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Vital = sequelize.define('Vital', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    mrn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    measurements: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staff',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Vital',
    timestamps: true,
    indexes: [
      { fields: ['patientId'] },
      { fields: ['timestamp'] },
      { fields: ['recordedBy'] }
    ]
  });

  Vital.associate = (models) => {
    Vital.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Vital.belongsTo(models.Staff, {
      foreignKey: 'recordedBy',
      as: 'recorder'
    });
  };

  return Vital;
};
