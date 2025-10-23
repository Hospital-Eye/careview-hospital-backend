const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Admission = sequelize.define('Admission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patient',
        key: 'id'
      }
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clinicId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    admissionDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    reportSentTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dischargeDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    currentWorkflowStage: {
      type: DataTypes.ENUM(
        'Checked-In',
        'In Preparation',
        'In Thermal',
        'In CT',
        'Awaiting Results',
        'Review with Physician',
        'Report Sent',
        'Discharged',
        'Canceled',
        'On Hold'
      ),
      allowNull: false,
      defaultValue: 'Checked-In'
    },
    acuityLevel: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'Completed', 'Canceled', 'On Hold'),
      allowNull: false,
      defaultValue: 'Active'
    },
    admittedByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staff',
        key: 'id'
      }
    },
    attendingPhysicianId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staff',
        key: 'id'
      }
    },
    admissionReason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    room: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Room',
        key: 'id'
      }
    },
    diagnoses: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    carePlan: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    documentation: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    dietaryRestrictions: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Admission',
    timestamps: true,
    indexes: [
      { fields: ['patientId'] },
      { fields: ['status', 'checkInTime'] },
      { fields: ['currentWorkflowStage', 'updatedAt'] },
      { fields: ['organizationId'] },
      { fields: ['clinicId'] }
    ]
  });

  Admission.associate = (models) => {
    Admission.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Admission.belongsTo(models.Staff, {
      foreignKey: 'admittedByStaffId',
      as: 'admittedByStaff'
    });
    Admission.belongsTo(models.Staff, {
      foreignKey: 'attendingPhysicianId',
      as: 'attendingPhysician'
    });
    Admission.belongsTo(models.Room, {
      foreignKey: 'room',
      as: 'roomDetails'
    });
  };

  return Admission;
};
