const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const MP4Event = sequelize.define('MP4Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mp4FileId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'MP4File',
        key: 'id'
      }
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('people-stats', 'enter', 'exit', 'processing-complete'),
      allowNull: true
    },
    ts: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'MP4Event',
    timestamps: true,
    indexes: [
      { fields: ['mp4FileId'] },
      { fields: ['filename'] },
      { fields: ['type'] },
      { fields: ['ts'] },
      { fields: ['mp4FileId', 'ts'] },
      { fields: ['filename', 'ts'] }
    ]
  });

  MP4Event.associate = (models) => {
    MP4Event.belongsTo(models.MP4File, {
      foreignKey: 'mp4FileId',
      as: 'mp4File'
    });
  };

  return MP4Event;
};
