const { Sequelize } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const config = require('./sequelize.js')[env];

// Initialize Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    define: config.define,
    dialectOptions: config.dialectOptions || {}
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');

    // Sync models in development (optional - migrations are preferred)
    if (env === 'development' && process.env.AUTO_SYNC === 'true') {
      await sequelize.sync({ alter: false });
      console.log('📊 Database models synchronized');
    }
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
module.exports.Sequelize = Sequelize;
