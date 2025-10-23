#!/usr/bin/env node

/**
 * Migration Validation Script
 *
 * Compares record counts between MongoDB and PostgreSQL
 * to ensure data was migrated successfully.
 *
 * Usage:
 *   node scripts/validate-migration.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const db = require('../models');
const { sequelize } = require('../config/db');

// MongoDB models
const MongoModels = {
  User: require('../models/User.mongoose.js'),
  Organization: require('../models/Organization.mongoose.js'),
  Clinic: require('../models/Clinic.mongoose.js'),
  Patient: require('../models/Patient.mongoose.js'),
  Staff: require('../models/Staff.mongoose.js'),
  Room: require('../models/Room.mongoose.js'),
  Admission: require('../models/Admission.mongoose.js'),
  Task: require('../models/Task.mongoose.js'),
  Vital: require('../models/Vital.mongoose.js'),
  Scan: require('../models/Scan.mongoose.js'),
  Notification: require('../models/Notification.mongoose.js'),
  ComplianceAlert: require('../models/ComplianceAlert.mongoose.js'),
  Camera: require('../models/Camera.mongoose.js'),
  CVDetection: require('../models/CVDetection.mongoose.js'),
  CVEvent: require('../models/CVEvent.mongoose.js'),
  MP4File: require('../models/MP4File.mongoose.js'),
  MP4Event: require('../models/MP4Event.mongoose.js'),
  AnalyticsEvent: require('../models/AnalyticsEvent.mongoose.js'),
  DeviceLog: require('../models/DeviceLog.mongoose.js'),
  UserSession: require('../models/UserSession.mongoose.js'),
  Counter: require('../models/Counter.mongoose.js')
};

async function validateMigration() {
  try {
    // Connect to databases
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    console.log('🐘 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected\n');

    console.log('═══════════════════════════════════════════════');
    console.log('  Migration Validation Report');
    console.log('═══════════════════════════════════════════════\n');

    const models = [
      'User', 'Organization', 'Clinic', 'Patient', 'Staff', 'Room',
      'Admission', 'Task', 'Vital', 'Scan', 'Notification',
      'ComplianceAlert', 'Camera', 'CVDetection', 'CVEvent',
      'MP4File', 'MP4Event', 'AnalyticsEvent', 'DeviceLog',
      'UserSession', 'Counter'
    ];

    let allMatch = true;
    const results = [];

    for (const modelName of models) {
      try {
        const mongoCount = await MongoModels[modelName].countDocuments();
        const pgCount = await db[modelName].count();

        const match = mongoCount === pgCount;
        const status = match ? '✅' : '❌';

        results.push({
          model: modelName,
          mongo: mongoCount,
          postgres: pgCount,
          match,
          status
        });

        if (!match) {
          allMatch = false;
        }
      } catch (error) {
        results.push({
          model: modelName,
          mongo: '?',
          postgres: '?',
          match: false,
          status: '⚠️',
          error: error.message
        });
        allMatch = false;
      }
    }

    // Print results table
    console.log('Model                 │ MongoDB │ PostgreSQL │ Status');
    console.log('─'.repeat(60));

    results.forEach(r => {
      const model = r.model.padEnd(20);
      const mongo = String(r.mongo).padStart(7);
      const postgres = String(r.postgres).padStart(10);
      console.log(`${model} │ ${mongo} │ ${postgres} │ ${r.status}`);

      if (r.error) {
        console.log(`  └─ Error: ${r.error}`);
      }
    });

    console.log('\n═══════════════════════════════════════════════');

    if (allMatch) {
      console.log('✅ All record counts match! Migration validated successfully.');
    } else {
      console.log('❌ Some record counts do not match. Please review.');
    }

    console.log('═══════════════════════════════════════════════\n');

    // Summary
    const total = results.reduce((sum, r) => sum + (typeof r.postgres === 'number' ? r.postgres : 0), 0);
    console.log(`Total records in PostgreSQL: ${total}`);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
    console.log('\n👋 Database connections closed');
  }
}

if (require.main === module) {
  validateMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { validateMigration };
