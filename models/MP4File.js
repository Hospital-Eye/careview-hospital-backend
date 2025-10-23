const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const MP4File = sequelize.define('MP4File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mimetype: {
      type: DataTypes.STRING,
      allowNull: false
    },
    analyticsStatus: {
      type: DataTypes.ENUM('idle', 'running', 'completed', 'error'),
      allowNull: false,
      defaultValue: 'idle'
    },
    analyticsStartedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    analyticsStoppedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    analyticsResults: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'MP4File',
    timestamps: true,
    indexes: [
      { fields: ['filename'], unique: true },
      { fields: ['analyticsStatus'] }
    ]
  });

  MP4File.associate = (models) => {
    MP4File.hasMany(models.MP4Event, {
      foreignKey: 'mp4FileId',
      as: 'events'
    });
  };

  return MP4File;
};
