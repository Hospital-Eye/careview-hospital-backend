const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Clinic = sequelize.define('Clinic', {
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
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dateOfEstablishment: {
      type: DataTypes.DATE,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM(
        'Diagnostic',
        'Hospital',
        'Clinic',
        'Branch',
        'Emergency Center',
        'Medical Center',
        'General Practice'
      ),
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GeoJSON location data'
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'Clinic',
    timestamps: true,
    indexes: [
      { fields: ['clinicId'], unique: true },
      { fields: ['organizationId'] }
    ]
  });

  // --------------------------
  // 🔹 Associations
  // --------------------------
  Clinic.associate = (models) => {
    Clinic.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      targetKey: 'organizationId',
      as: 'organization'
    });

    Clinic.hasMany(models.User, {
      foreignKey: 'clinicId',
      sourceKey: 'clinicId',
      as: 'managers'
    });
  };

  return Clinic;
};
