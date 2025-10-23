const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Camera = sequelize.define('Camera', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rtspPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 554
    },
    auth: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    defaultChannel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    defaultStream: {
      type: DataTypes.ENUM('main', 'sub'),
      allowNull: false,
      defaultValue: 'sub'
    },
    transport: {
      type: DataTypes.ENUM('tcp', 'udp', 'http'),
      allowNull: false,
      defaultValue: 'tcp'
    },
    forceEncode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    autostart: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'Camera',
    timestamps: true,
    indexes: [
      { fields: ['isActive'] },
      { fields: ['ip'] }
    ]
  });

  Camera.associate = (models) => {
    Camera.hasMany(models.CVEvent, {
      foreignKey: 'cameraId',
      as: 'cvEvents'
    });
  };

  return Camera;
};
