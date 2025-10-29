const fs = require('fs');
const path = require('path');
const db = require('../models');

/**
 * Export all database tables to JSON files
 * This script exports data in the correct order to handle foreign key dependencies
 */

// Define the order of tables to export (respecting foreign key dependencies)
const EXPORT_ORDER = [
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

const exportData = async () => {
  try {
    console.log('🚀 Starting data export...\n');

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory\n');
    }

    const exportStats = {
      totalRecords: 0,
      tables: {}
    };

    // Export each table in order
    for (const modelName of EXPORT_ORDER) {
      const model = db[modelName];

      if (!model) {
        console.log(`⚠️  Model ${modelName} not found, skipping...`);
        continue;
      }

      try {
        // Fetch all records from the table
        const records = await model.findAll({
          raw: true // Get plain objects instead of Sequelize instances
        });

        const fileName = `${modelName.toLowerCase()}.json`;
        const filePath = path.join(dataDir, fileName);

        // Write to JSON file
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2));

        exportStats.tables[modelName] = records.length;
        exportStats.totalRecords += records.length;

        console.log(`✅ ${modelName}: ${records.length} records exported`);
      } catch (error) {
        console.error(`❌ Error exporting ${modelName}:`, error.message);
      }
    }

    // Create metadata file with export information
    const metadata = {
      exportDate: new Date().toISOString(),
      totalTables: Object.keys(exportStats.tables).length,
      totalRecords: exportStats.totalRecords,
      tables: exportStats.tables,
      nodeVersion: process.version,
      databaseDialect: db.sequelize.options.dialect
    };

    const metadataPath = path.join(dataDir, '_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log('\n📊 Export Summary:');
    console.log(`   Total tables: ${metadata.totalTables}`);
    console.log(`   Total records: ${metadata.totalRecords}`);
    console.log(`   Export location: ${dataDir}`);
    console.log(`   Export date: ${new Date(metadata.exportDate).toLocaleString()}\n`);
    console.log('✨ Export completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
};

// Run the export
exportData();
