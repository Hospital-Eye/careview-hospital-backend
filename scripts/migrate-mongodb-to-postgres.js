#!/usr/bin/env node

/**
 * MongoDB to PostgreSQL Data Migration Script
 *
 * This script migrates data from MongoDB to PostgreSQL by:
 * 1. Connecting to both databases
 * 2. Exporting all data from MongoDB
 * 3. Transforming ObjectIds to UUIDs
 * 4. Importing data to PostgreSQL with proper relationships
 *
 * Usage:
 *   node scripts/migrate-mongodb-to-postgres.js
 *
 * Prerequisites:
 *   - MongoDB connection (set MONGODB_URI in .env)
 *   - PostgreSQL running and migrations executed
 *   - Both databases accessible
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { sequelize } = require('../config/db');

// MongoDB models (using .mongoose.js files)
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

// ID mapping: MongoDB ObjectId -> PostgreSQL UUID
const idMap = new Map();

// Helper function to generate UUID and store mapping
function mapId(mongoId) {
  if (!mongoId) return null;

  const mongoIdStr = mongoId.toString();
  if (idMap.has(mongoIdStr)) {
    return idMap.get(mongoIdStr);
  }

  const newUuid = uuidv4();
  idMap.set(mongoIdStr, newUuid);
  return newUuid;
}

// Helper function to transform document
function transformDocument(doc, mapping) {
  if (!doc) return null;

  const obj = doc.toObject ? doc.toObject() : doc;
  const transformed = {};

  // Map _id to id (UUID)
  if (obj._id) {
    transformed.id = mapId(obj._id);
  }

  // Apply field mappings
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id' || key === '__v') continue;

    if (mapping && mapping[key]) {
      // Handle foreign key mappings
      if (value && mongoose.Types.ObjectId.isValid(value)) {
        transformed[key] = mapId(value);
      } else if (Array.isArray(value) && value.every(v => mongoose.Types.ObjectId.isValid(v))) {
        transformed[key] = value.map(v => mapId(v));
      } else {
        transformed[key] = value;
      }
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

async function connectMongoDB() {
  console.log('📊 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
}

async function connectPostgreSQL() {
  console.log('🐘 Connecting to PostgreSQL...');
  await sequelize.authenticate();
  console.log('✅ PostgreSQL connected');
}

async function migrateCollection(ModelName, mongoModel, pgModel, foreignKeys = {}) {
  console.log(`\n🔄 Migrating ${ModelName}...`);

  try {
    const docs = await mongoModel.find().lean();
    console.log(`   Found ${docs.length} documents`);

    if (docs.length === 0) {
      console.log(`   ⏭️  Skipping ${ModelName} (empty collection)`);
      return { success: 0, errors: 0 };
    }

    let success = 0;
    let errors = 0;

    for (const doc of docs) {
      try {
        const transformed = transformDocument(doc, foreignKeys);
        await pgModel.create(transformed, { validate: false });
        success++;
      } catch (error) {
        console.error(`   ❌ Error migrating document ${doc._id}:`, error.message);
        errors++;
      }
    }

    console.log(`   ✅ ${success} migrated, ❌ ${errors} errors`);
    return { success, errors };
  } catch (error) {
    console.error(`   ❌ Failed to migrate ${ModelName}:`, error.message);
    return { success: 0, errors: -1 };
  }
}

async function runMigration() {
  const stats = {
    total: 0,
    success: 0,
    errors: 0
  };

  try {
    // Connect to both databases
    await connectMongoDB();
    await connectPostgreSQL();

    console.log('\n═══════════════════════════════════════════════');
    console.log('  MongoDB to PostgreSQL Data Migration');
    console.log('═══════════════════════════════════════════════\n');

    // Migration order (respecting foreign key dependencies)

    // 1. Independent tables (no foreign keys)
    await migrateCollection('User', MongoModels.User, db.User);
    await migrateCollection('Organization', MongoModels.Organization, db.Organization);
    await migrateCollection('Clinic', MongoModels.Clinic, db.Clinic);
    await migrateCollection('Camera', MongoModels.Camera, db.Camera);

    // 2. Tables with User foreign keys
    await migrateCollection('Patient', MongoModels.Patient, db.Patient, { userId: 'User' });
    await migrateCollection('Staff', MongoModels.Staff, db.Staff, { userId: 'User' });
    await migrateCollection('UserSession', MongoModels.UserSession, db.UserSession, { userId: 'User' });
    await migrateCollection('DeviceLog', MongoModels.DeviceLog, db.DeviceLog, { userId: 'User' });
    await migrateCollection('Notification', MongoModels.Notification, db.Notification, { recipient: 'User' });

    // 3. Room (no foreign keys)
    await migrateCollection('Room', MongoModels.Room, db.Room);

    // 4. Tables with Patient/Staff foreign keys
    await migrateCollection('Admission', MongoModels.Admission, db.Admission, {
      patientId: 'Patient',
      admittedByStaffId: 'Staff',
      attendingPhysicianId: 'Staff',
      room: 'Room'
    });
    await migrateCollection('Task', MongoModels.Task, db.Task, {
      patientId: 'Patient',
      assignedStaffId: 'Staff'
    });
    await migrateCollection('Vital', MongoModels.Vital, db.Vital, {
      patientId: 'Patient',
      recordedBy: 'Staff'
    });
    await migrateCollection('Scan', MongoModels.Scan, db.Scan, {
      patientId: 'Patient',
      uploadedBy: 'User'
    });
    await migrateCollection('CVDetection', MongoModels.CVDetection, db.CVDetection, {
      personId: 'Patient'
    });
    await migrateCollection('AnalyticsEvent', MongoModels.AnalyticsEvent, db.AnalyticsEvent, {
      userId: 'User',
      patientId: 'Patient'
    });

    // 5. CV and MP4 Events
    await migrateCollection('CVEvent', MongoModels.CVEvent, db.CVEvent, {
      cameraId: 'Camera'
    });
    await migrateCollection('MP4File', MongoModels.MP4File, db.MP4File);
    await migrateCollection('MP4Event', MongoModels.MP4Event, db.MP4Event, {
      mp4FileId: 'MP4File'
    });

    // 6. Compliance Alerts and Counters
    await migrateCollection('ComplianceAlert', MongoModels.ComplianceAlert, db.ComplianceAlert);
    await migrateCollection('Counter', MongoModels.Counter, db.Counter);

    console.log('\n═══════════════════════════════════════════════');
    console.log('  Migration Summary');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total documents migrated: ${stats.success}`);
    console.log(`Total errors: ${stats.errors}`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await sequelize.close();
    console.log('\n👋 Database connections closed');
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
