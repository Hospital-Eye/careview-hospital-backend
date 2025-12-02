const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const PatientRegistrationRequest = sequelize.define("PatientRegistrationRequest", {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "User",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    name: DataTypes.STRING,
    dob: DataTypes.DATEONLY,
    gender: DataTypes.STRING, 
    phone: DataTypes.STRING,
    emailId: DataTypes.STRING,
    organizationId: DataTypes.STRING,
    clinicId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    requiresIsolationPrecautions: DataTypes.BOOLEAN,
    allergies: DataTypes.ARRAY(DataTypes.STRING),
    diagnoses: DataTypes.ARRAY(DataTypes.STRING),
    emergencyContact: DataTypes.JSONB,
    status: {
      type: DataTypes.STRING, 
      defaultValue: "pending"
    }
  });

  // Associations
  PatientRegistrationRequest.associate = (models) => {
    PatientRegistrationRequest.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    PatientRegistrationRequest.belongsTo(models.Clinic, { foreignKey: "clinicId", as: "clinic" });
  };

  return PatientRegistrationRequest;
};
