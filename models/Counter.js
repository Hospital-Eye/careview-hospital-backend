const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Counter = sequelize.define('Counter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    seq: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    }
  }, {
    tableName: 'Counter',
    timestamps: true,
    indexes: [
      { fields: ['clinicId'], unique: true }
    ]
  });

  Counter.associate = (models) => {
    // No associations
  };

  return Counter;
};
