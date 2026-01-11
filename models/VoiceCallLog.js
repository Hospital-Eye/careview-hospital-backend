const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const CallLog = sequelize.define("CallLog", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    callId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    agentId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    clinicId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },

    callStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },

    startTimestamp: {
      type: DataTypes.BIGINT,
      allowNull: true
    },

    endTimestamp: {
      type: DataTypes.BIGINT,
      allowNull: true
    },

    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    disconnectionReason: {
      type: DataTypes.STRING,
      allowNull: true
    },

    transcript: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  });

  CallLog.associate = (models) => {
    CallLog.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return CallLog;
};
