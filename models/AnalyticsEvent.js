const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
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
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'AnalyticsEvent',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['patientId'] },
      { fields: ['eventType'] },
      { fields: ['timestamp'] }
    ]
  });

  AnalyticsEvent.associate = (models) => {
    AnalyticsEvent.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    AnalyticsEvent.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
  };

  return AnalyticsEvent;
};
