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
const fs = require('fs');
const path = require('path');

// MongoDB models (using .mongoose.js files)
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

// Global ID mapping shared across all migrations
const globalIdMap = {};

async function migrateCollection(ModelName, mongoModel, pgModel, fkMap = {}) {
  console.log(`\n🚀 Migrating ${ModelName}...`);

  const docs = await mongoModel.find().lean();
  console.log(`   Found ${docs.length} documents in MongoDB`);

  // Load existing PostgreSQL records and try to map them back to MongoDB IDs
  // This is needed when re-running migration after partial completion
  const existingRecords = await pgModel.findAll({ raw: true });
  console.log(`   Found ${existingRecords.length} existing records in PostgreSQL`);

  // Initialize globalIdMap for this model
  globalIdMap[ModelName] = globalIdMap[ModelName] || {};

  // Try to match existing PG records to MongoDB docs by comparing unique fields
  if (existingRecords.length > 0 && docs.length > 0) {
    // For models with unique identifiers, map them
    if (ModelName === 'User' && docs[0].googleId) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.googleId === pgRec.googleId || d.email === pgRec.email);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Patient' && docs[0].mrn) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.mrn === pgRec.mrn);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Staff' && docs[0].employeeId) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.employeeId === pgRec.employeeId);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Room' && docs[0].roomNumber) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.roomNumber === pgRec.roomNumber && d.clinicId === pgRec.clinicId);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Clinic' && docs[0].clinicId) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.clinicId === pgRec.clinicId);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Organization' && docs[0].organizationId) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.organizationId === pgRec.organizationId);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'Camera' && docs[0].ip) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.ip === pgRec.ip && d.name === pgRec.name);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    } else if (ModelName === 'MP4File' && docs[0].filename) {
      existingRecords.forEach(pgRec => {
        const matchingDoc = docs.find(d => d.filename === pgRec.filename);
        if (matchingDoc) {
          globalIdMap[ModelName][matchingDoc._id.toString()] = pgRec.id;
        }
      });
    }
    console.log(`   Mapped ${Object.keys(globalIdMap[ModelName]).length} existing records to MongoDB IDs`);
  }

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const failedDocs = [];

  for (const doc of docs) {
    try {
      const transformed = { ...doc };

      // 🔁 Replace _id with new Postgres-compatible ID
      const mongoIdStr = doc._id.toString();
      delete transformed._id;
      delete transformed.__v;

      // Check if already migrated (skip if exists in globalIdMap)
      if (globalIdMap[ModelName] && globalIdMap[ModelName][mongoIdStr]) {
        skipped++;
        continue;
      }

      // 🔗 Replace foreign key ObjectIds using the globalIdMap
      for (const [pgField, refModel] of Object.entries(fkMap)) {
        const mongoRefId = doc[pgField];
        if (mongoRefId) {
          const mongoRefIdStr = mongoRefId.toString();
          if (globalIdMap[refModel] && globalIdMap[refModel][mongoRefIdStr]) {
            transformed[pgField] = globalIdMap[refModel][mongoRefIdStr];
          } else {
            // Log missing FK but still try inserting with null
            console.warn(`⚠️ Missing FK in ${ModelName}.${pgField}: ${mongoRefIdStr} (ref: ${refModel})`);
            transformed[pgField] = null;
          }
        }
      }

      // 🔄 Transform comma-separated strings to arrays for Room model
      if (ModelName === 'Room') {
        if (typeof transformed.equipment === 'string') {
          transformed.equipment = transformed.equipment.split(',').map(s => s.trim());
        }
        if (typeof transformed.cameraIds === 'string') {
          transformed.cameraIds = transformed.cameraIds.split(',').map(s => s.trim());
        }
        if (typeof transformed.accessRestrictions === 'string') {
          transformed.accessRestrictions = transformed.accessRestrictions.split(',').map(s => s.trim());
        }
      }

      // 🔄 Fix MP4File enum value
      if (ModelName === 'MP4File' && transformed.analyticsStatus === 'stopped') {
        transformed.analyticsStatus = 'idle'; // Map 'stopped' to 'idle'
      }

      // 🔄 Fix DeviceLog - skip if userId is missing (data inconsistency)
      if (ModelName === 'DeviceLog' && !doc.userId) {
        console.warn(`⚠️ Skipping DeviceLog ${mongoIdStr} - missing userId (has 'user' field instead)`);
        skipped++;
        continue;
      }

      // 🗄️ Insert into Postgres
      const created = await pgModel.create(transformed, { validate: false });

      // 🧭 Keep ID map for future references
      globalIdMap[ModelName] = globalIdMap[ModelName] || {};
      globalIdMap[ModelName][mongoIdStr] = created.id;

      success++;

    } catch (error) {
      errors++;
      failedDocs.push({
        mongoId: doc._id,
        error: error.message,
        model: ModelName,
        document: doc,
      });
      console.error(`❌ Error migrating ${ModelName} document ${doc._id}:`, error.message);
    }
  }

  // 💾 Write failures to file if any
  if (failedDocs.length > 0) {
    const dir = path.resolve(__dirname, 'migration-logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const filePath = path.join(dir, `failed_${ModelName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(failedDocs, null, 2));
    console.log(`📁 Logged ${failedDocs.length} failed ${ModelName} records to ${filePath}`);
  }

  console.log(`✅ ${ModelName}: ${success} migrated, ${skipped} skipped, ${errors} errors (${success}/${docs.length} total)`);
  return { success, errors, skipped };
}




/*
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

    if (docs.length > 0) console.log(`Sample doc from ${ModelName}:`, docs[0]);

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
}*/

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
    await migrateCollection('DeviceLog', MongoModels.DeviceLog, db.DeviceLog, { userId: 'User' });

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
