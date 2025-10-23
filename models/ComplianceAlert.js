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
    // No direct foreign key associations due to JSONB fields
  };

  return ComplianceAlert;
};
