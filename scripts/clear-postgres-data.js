#!/usr/bin/env node

/**
 * Clear all data from PostgreSQL tables
 * Preserves schema and migrations, only deletes data
 */

require('dotenv').config();
const { sequelize } = require('../config/db');

async function clearAllData() {
  try {
    console.log('🐘 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected\n');

    console.log('⚠️  WARNING: This will delete ALL data from ALL tables!');
    console.log('   Schema and migrations will be preserved.\n');

    // Get all table names except SequelizeMeta
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != 'SequelizeMeta'
      ORDER BY tablename;
    `);

    console.log(`📋 Found ${tables.length} tables to clear:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    console.log('');

    // Disable foreign key checks temporarily
    console.log('🔓 Disabling foreign key constraints...');
    await sequelize.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const table of tables) {
      console.log(`🗑️  Truncating ${table.tablename}...`);
      await sequelize.query(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE;`);
    }

    // Re-enable foreign key checks
    console.log('🔒 Re-enabling foreign key constraints...');
    await sequelize.query('SET session_replication_role = DEFAULT;');

    console.log('\n✅ All data cleared successfully!');
    console.log('   Tables are now empty and ready for fresh migration.\n');

  } catch (error) {
    console.error('\n❌ Error clearing data:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('👋 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  clearAllData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { clearAllData };
