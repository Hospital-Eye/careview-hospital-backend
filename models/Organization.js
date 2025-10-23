const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GeoJSON location data - commented out as in MongoDB schema'
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
    tableName: 'Organization',
    timestamps: true
  });

  Organization.associate = (models) => {
    Organization.hasMany(models.Clinic, {
      foreignKey: 'organizationId',
      sourceKey: 'organizationId',
      as: 'clinics'
    });
  };

  return Organization;
};
