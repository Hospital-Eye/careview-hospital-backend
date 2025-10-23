const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    roomType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    occupiedBeds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    equipment: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    cameraIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    accessRestrictions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'Room',
    timestamps: true,
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['clinicId'] },
      { fields: ['roomNumber', 'clinicId'] }
    ]
  });

  Room.associate = (models) => {
    Room.hasMany(models.Admission, {
      foreignKey: 'room',
      as: 'admissions'
    });
  };

  return Room;
};
