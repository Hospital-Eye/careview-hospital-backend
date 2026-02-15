const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CallLog = sequelize.define(
    "CallLog",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

      userId: { type: DataTypes.UUID, allowNull: true },
      callId: { type: DataTypes.STRING, allowNull: false },
      agentId: { type: DataTypes.STRING, allowNull: false },
      organizationId: { type: DataTypes.STRING, allowNull: false },
      clinicId: { type: DataTypes.STRING, allowNull: false },

      name: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },

      patientId: { type: DataTypes.UUID, allowNull: true },
      finalized: { type: DataTypes.BOOLEAN, defaultValue: false },

      callStatus: { type: DataTypes.STRING, allowNull: false },
      startTimestamp: { type: DataTypes.BIGINT, allowNull: true },
      endTimestamp: { type: DataTypes.BIGINT, allowNull: true },
      durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
      disconnectionReason: { type: DataTypes.STRING, allowNull: true },
      transcript: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "CallLog",   
      freezeTableName: true,   
      timestamps: true,        
    }
  );

  CallLog.associate = (models) => {
    CallLog.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return CallLog;
};
