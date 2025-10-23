const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const DeviceLog = sequelize.define('DeviceLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entity: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'DeviceLog',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['timestamp'] },
      { fields: ['action'] }
    ]
  });

  DeviceLog.associate = (models) => {
    DeviceLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return DeviceLog;
};
