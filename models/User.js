const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    signupByCall: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    phone: {
      type: DataTypes.STRING,
      allowNull: true,   
      unique: false      
    },
    password: {
      type: DataTypes.STRING,   
      allowNull: true,          
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profilePicture: {
      type: DataTypes.TEXT,
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
      type: DataTypes.ENUM('admin', 'manager', 'doctor', 'nurse', 'patient', 'user'),
      allowNull: false,
      defaultValue: 'user'
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
    User.hasMany(models.DeviceLog, {
      foreignKey: 'userId',
      as: 'deviceLogs'
    });
    User.hasMany(models.AnalyticsEvent, {
      foreignKey: 'userId',
      as: 'analyticsEvents'
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
