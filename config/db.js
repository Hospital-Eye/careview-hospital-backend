const { Sequelize } = require('sequelize');
require('dotenv').config();
const { logger } = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = require('./sequelize.js')[env];

// Detect Cloud SQL socket
const isCloudSQL =
  config.host && config.host.startsWith('/cloudsql');

// Initialize Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    define: config.define,

    ...(isCloudSQL
      ? {
          dialectOptions: {
            socketPath: config.host, // ✅ Cloud SQL socket
          },
        }
      : {
          host: config.host,
          port: config.port,
          dialectOptions: config.dialectOptions || {},
        }),
  }
);

const connectDB = async () => {
  try {
    logger.info('Starting DB connection...');
    logger.info(
      `DB mode: ${isCloudSQL ? 'Cloud SQL (socket)' : 'Standard TCP'}`
    );

    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');

    if (env === 'development' && process.env.AUTO_SYNC === 'true') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error); // full error
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
module.exports.Sequelize = Sequelize;