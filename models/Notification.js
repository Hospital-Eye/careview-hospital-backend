const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('alert', 'reminder', 'update'),
      allowNull: false,
      defaultValue: 'alert'
    },
    recipient: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'Notification',
    timestamps: true,
    indexes: [
      { fields: ['recipient'] },
      { fields: ['read'] },
      { fields: ['createdAt'] }
    ]
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: 'recipient',
      as: 'user'
    });
  };

  return Notification;
};
