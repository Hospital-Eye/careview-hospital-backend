const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ComplianceAlert = sequelize.define('ComplianceAlert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('Low', 'Moderate', 'High', 'Critical'),
      allowNull: false
    },
    source: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    recipients: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Acknowledged', 'Resolved'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    timestamps: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    associatedIds: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'AnalyticsEvent',
        key: 'id'
      }
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staff',
        key: 'id'
      }
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Room',
        key: 'id'
      }
    }
  }, {
    tableName: 'ComplianceAlert',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['severity'] },
      { fields: ['createdAt'] }
    ]
  });

  ComplianceAlert.associate = (models) => {
    ComplianceAlert.belongsTo(models.AnalyticsEvent, {
      foreignKey: 'eventId',
      as: 'sourceEvent'
    });
    ComplianceAlert.belongsTo(models.Staff, {
      foreignKey: 'staffId',
      as: 'recipientStaff'
    });
    ComplianceAlert.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'associatedPatient'
    });
    ComplianceAlert.belongsTo(models.Room, {
      foreignKey: 'roomId',
      as: 'associatedRoom'
    });
  };


  return ComplianceAlert;
};
