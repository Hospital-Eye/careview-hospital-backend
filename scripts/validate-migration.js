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
  User: require('../models_mongo/User.mongoose.js'),
  Organization: require('../models_mongo/Organization.mongoose.js'),
  Clinic: require('../models_mongo/Clinic.mongoose.js'),
  Patient: require('../models_mongo/Patient.mongoose.js'),
  Staff: require('../models_mongo/Staff.mongoose.js'),
  Room: require('../models_mongo/Room.mongoose.js'),
  Admission: require('../models_mongo/Admission.mongoose.js'),
  Task: require('../models_mongo/Task.mongoose.js'),
  Vital: require('../models_mongo/Vital.mongoose.js'),
  Scan: require('../models_mongo/Scan.mongoose.js'),
  Notification: require('../models_mongo/Notification.mongoose.js'),
  ComplianceAlert: require('../models_mongo/ComplianceAlert.mongoose.js'),
  Camera: require('../models_mongo/Camera.mongoose.js'),
  CVDetection: require('../models_mongo/CVDetection.mongoose.js'),
  CVEvent: require('../models_mongo/CVEvent.mongoose.js'),
  MP4File: require('../models_mongo/MP4File.mongoose.js'),
  MP4Event: require('../models_mongo/MP4Event.mongoose.js'),
  AnalyticsEvent: require('../models_mongo/AnalyticsEvent.mongoose.js'),
  DeviceLog: require('../models_mongo/DeviceLog.mongoose.js'),
  UserSession: require('../models_mongo/UserSession.mongoose.js'),
  Counter: require('../models_mongo/Counter.mongoose.js')
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
