const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Scan = sequelize.define('Scan', {
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
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    mrn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    scanType: {
      type: DataTypes.ENUM(
        'Brain CT',
        'Chest CT',
        'Abdominal CT',
        'Pelvic CT',
        'Spine CT',
        'Other'
      ),
      allowNull: false
    },
    urgencyLevel: {
      type: DataTypes.ENUM('Routine', 'Urgent', 'Critical'),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending Review', 'Reviewed', 'Archived'),
      allowNull: false,
      defaultValue: 'Pending Review'
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Scan',
    timestamps: true,
    indexes: [
      { fields: ['patientId'] },
      { fields: ['organizationId'] },
      { fields: ['clinicId'] },
      { fields: ['status'] }
    ]
  });

  Scan.associate = (models) => {
    Scan.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Scan.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
  };

  return Scan;
};
