'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Checking ComplianceAlert table for missing foreign key columns...');

    // Get current table structure
    const tableDescription = await queryInterface.describeTable('ComplianceAlert');

    // Add eventId column if it doesn't exist
    if (!tableDescription.eventId) {
      await queryInterface.addColumn('ComplianceAlert', 'eventId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'AnalyticsEvent',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ eventId column added to ComplianceAlert table');
    } else {
      console.log('ℹ️  eventId column already exists in ComplianceAlert table');
    }

    // Add staffId column if it doesn't exist
    if (!tableDescription.staffId) {
      await queryInterface.addColumn('ComplianceAlert', 'staffId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ staffId column added to ComplianceAlert table');
    } else {
      console.log('ℹ️  staffId column already exists in ComplianceAlert table');
    }

    // Add patientId column if it doesn't exist
    if (!tableDescription.patientId) {
      await queryInterface.addColumn('ComplianceAlert', 'patientId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ patientId column added to ComplianceAlert table');
    } else {
      console.log('ℹ️  patientId column already exists in ComplianceAlert table');
    }

    // Add roomId column if it doesn't exist
    if (!tableDescription.roomId) {
      await queryInterface.addColumn('ComplianceAlert', 'roomId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Room',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ roomId column added to ComplianceAlert table');
    } else {
      console.log('ℹ️  roomId column already exists in ComplianceAlert table');
    }

    console.log('✅ ComplianceAlert foreign key migration completed');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back ComplianceAlert foreign key columns...');

    // Get current table structure
    const tableDescription = await queryInterface.describeTable('ComplianceAlert');

    // Remove columns in reverse order if they exist
    if (tableDescription.roomId) {
      await queryInterface.removeColumn('ComplianceAlert', 'roomId');
      console.log('✅ roomId column removed from ComplianceAlert table');
    }

    if (tableDescription.patientId) {
      await queryInterface.removeColumn('ComplianceAlert', 'patientId');
      console.log('✅ patientId column removed from ComplianceAlert table');
    }

    if (tableDescription.staffId) {
      await queryInterface.removeColumn('ComplianceAlert', 'staffId');
      console.log('✅ staffId column removed from ComplianceAlert table');
    }

    if (tableDescription.eventId) {
      await queryInterface.removeColumn('ComplianceAlert', 'eventId');
      console.log('✅ eventId column removed from ComplianceAlert table');
    }

    console.log('✅ ComplianceAlert foreign key rollback completed');
  }
};
