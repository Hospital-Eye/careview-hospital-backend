const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mrn: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
    dob: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    precautions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    diagnoses: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('Active', 'Discharged'),
      allowNull: false,
      defaultValue: 'Active'
    }
  }, {
    tableName: 'Patient',
    timestamps: true,
    indexes: [
      { fields: ['mrn'], unique: true },
      { fields: ['userId'], unique: true, where: { userId: { [sequelize.Sequelize.Op.ne]: null } } },
      { fields: ['organizationId'] },
      { fields: ['clinicId'] }
    ]
  });

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Patient.hasMany(models.Admission, {
      foreignKey: 'patientId',
      as: 'admissions'
    });
    Patient.hasMany(models.Vital, {
      foreignKey: 'patientId',
      as: 'vitals'
    });
    Patient.hasMany(models.Scan, {
      foreignKey: 'patientId',
      as: 'scans'
    });
    Patient.hasMany(models.Task, {
      foreignKey: 'patientId',
      as: 'tasks'
    });
    Patient.hasMany(models.AnalyticsEvent, {
      foreignKey: 'patientId',
      as: 'analyticsEvents'
    });
    Patient.hasMany(models.CVDetection, {
      foreignKey: 'personId',
      as: 'cvDetections'
    });
  };

  return Patient;
};
