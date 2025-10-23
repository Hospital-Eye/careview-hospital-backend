const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const CVEvent = sequelize.define('CVEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cameraId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Camera',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('people-stats', 'enter', 'exit'),
      allowNull: true
    },
    ts: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Epoch milliseconds from cv-service'
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'CVEvent',
    timestamps: true,
    indexes: [
      { fields: ['cameraId'] },
      { fields: ['type'] },
      { fields: ['ts'] },
      { fields: ['cameraId', 'ts'] },
      { fields: ['createdAt'] }
    ]
  });

  CVEvent.associate = (models) => {
    CVEvent.belongsTo(models.Camera, {
      foreignKey: 'cameraId',
      as: 'camera'
    });
  };

  return CVEvent;
};
