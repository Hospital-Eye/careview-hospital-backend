const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const CVDetection = sequelize.define('CVDetection', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    cameraId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    detectionType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    personId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    boundingBox: {
      type: DataTypes.ARRAY(DataTypes.FLOAT),
      allowNull: true
    },
    classification: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    triggeredAlertId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'CVDetection',
    timestamps: true,
    indexes: [
      { fields: ['timestamp'] },
      { fields: ['cameraId'] },
      { fields: ['personId'] }
    ]
  });

  CVDetection.associate = (models) => {
    CVDetection.belongsTo(models.Patient, {
      foreignKey: 'personId',
      as: 'person'
    });
  };

  return CVDetection;
};
