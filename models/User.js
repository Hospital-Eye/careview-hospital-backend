const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'doctor', 'nurse', 'patient'),
      allowNull: false,
      defaultValue: 'patient'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'User',
    timestamps: true,
    indexes: [
      { fields: ['googleId'], unique: true, where: { googleId: { [sequelize.Sequelize.Op.ne]: null } } },
      { fields: ['email'], unique: true }
    ]
  });

  User.associate = (models) => {
    User.hasOne(models.Patient, {
      foreignKey: 'userId',
      as: 'patient'
    });
    User.hasOne(models.Staff, {
      foreignKey: 'userId',
      as: 'staff'
    });
    User.hasMany(models.UserSession, {
      foreignKey: 'userId',
      as: 'sessions'
    });
    User.hasMany(models.DeviceLog, {
      foreignKey: 'userId',
      as: 'deviceLogs'
    });
    User.hasMany(models.AnalyticsEvent, {
      foreignKey: 'userId',
      as: 'analyticsEvents'
    });
    User.hasMany(models.Notification, {
      foreignKey: 'recipient',
      as: 'notifications'
    });
    User.hasMany(models.Scan, {
      foreignKey: 'uploadedBy',
      as: 'uploadedScans'
    });

    User.belongsTo(models.Clinic, {
    foreignKey: 'clinicId',
    targetKey: 'clinicId', 
    as: 'clinic'
  });
    User.belongsTo(models.Organization, {
    foreignKey: 'organizationId',
    targetKey: 'organizationId',
    as: 'organization'
  });


  };

  return User;
};
