const fs = require('fs');
const path = require('path');
const db = require('../models');

/**
 * Import data from JSON files into database tables
 * This script imports data in the correct order to handle foreign key dependencies
 * It can be run in two modes:
 * - Default: Clears existing data before importing
 * - Append mode: Adds data without clearing (use --append flag)
 */

// Define the order of tables to import (respecting foreign key dependencies)
const IMPORT_ORDER = [
  'Organization',
  'User',
  'Clinic',
  'Room',
  'Patient',
  'Staff',
  'Admission',
  'Task',
  'Vital',
  'Scan',
  'Notification',
  'ComplianceAlert',
  'Camera',
  'CVDetection',
  'CVEvent',
  'MP4File',
  'MP4Event',
  'AnalyticsEvent',
  'DeviceLog',
  'UserSession',
  'Counter'
];

const importData = async () => {
  try {
    // Check if append mode is enabled
    const appendMode = process.argv.includes('--append');
    const skipExisting = process.argv.includes('--skip-existing');

    console.log('🚀 Starting data import...');
    console.log(`   Mode: ${appendMode ? 'APPEND' : 'REPLACE'}`);
    if (skipExisting) {
      console.log('   Skip existing: YES');
    }
    console.log();

    const dataDir = path.join(__dirname, '..', 'data');

    // Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      console.error('❌ Data directory not found. Please run export-data.js first or ensure data folder exists.');
      process.exit(1);
    }

    // Read metadata if available
    const metadataPath = path.join(dataDir, '_metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log('📋 Data Export Information:');
      console.log(`   Export date: ${new Date(metadata.exportDate).toLocaleString()}`);
      console.log(`   Total records: ${metadata.totalRecords}`);
      console.log(`   Total tables: ${metadata.totalTables}\n`);
    }

    const importStats = {
      totalRecords: 0,
      tables: {}
    };

    // Import each table in order
    for (const modelName of IMPORT_ORDER) {
      const model = db[modelName];

      if (!model) {
        console.log(`⚠️  Model ${modelName} not found, skipping...`);
        continue;
      }

      const fileName = `${modelName.toLowerCase()}.json`;
      const filePath = path.join(dataDir, fileName);

      // Skip if file doesn't exist
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${modelName}: No data file found, skipping...`);
        continue;
      }

      try {
        // Read JSON file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const records = JSON.parse(fileContent);

        if (records.length === 0) {
          console.log(`⏭️  ${modelName}: No records to import, skipping...`);
          continue;
        }

        // Clear existing data if not in append mode
        if (!appendMode) {
          await model.destroy({ where: {}, truncate: true, cascade: true });
        }

        // Import records
        let importedCount = 0;
        let skippedCount = 0;

        for (const record of records) {
          try {
            if (skipExisting) {
              // Try to find existing record by primary key
              const primaryKey = model.primaryKeyAttribute;
              const existingRecord = await model.findByPk(record[primaryKey]);

              if (existingRecord) {
                skippedCount++;
                continue;
              }
            }

            await model.create(record, {
              validate: true,
              ignoreDuplicates: skipExisting
            });
            importedCount++;
          } catch (error) {
            // Handle duplicate key errors gracefully in append mode
            if (error.name === 'SequelizeUniqueConstraintError' && (appendMode || skipExisting)) {
              skippedCount++;
            } else {
              throw error;
            }
          }
        }

        importStats.tables[modelName] = {
          imported: importedCount,
          skipped: skippedCount,
          total: records.length
        };
        importStats.totalRecords += importedCount;

        const skipInfo = skippedCount > 0 ? ` (${skippedCount} skipped)` : '';
        console.log(`✅ ${modelName}: ${importedCount}/${records.length} records imported${skipInfo}`);
      } catch (error) {
        console.error(`❌ Error importing ${modelName}:`, error.message);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   Total tables: ${Object.keys(importStats.tables).length}`);
    console.log(`   Total records imported: ${importStats.totalRecords}`);
    console.log(`   Mode: ${appendMode ? 'APPEND' : 'REPLACE'}\n`);

    // Show detailed stats
    console.log('📋 Detailed Statistics:');
    for (const [table, stats] of Object.entries(importStats.tables)) {
      if (stats.skipped > 0) {
        console.log(`   ${table}: ${stats.imported} imported, ${stats.skipped} skipped`);
      }
    }

    console.log('\n✨ Import completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

// Run the import
importData();
