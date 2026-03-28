const { Sequelize } = require('sequelize');
require('dotenv').config();
const { logger } = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = require('./sequelize.js')[env];

// Detect Cloud SQL socket
const isCloudSQL = config.host?.startsWith('/');

const sequelize = isCloudSQL
  ? new Sequelize(
      // pg reads ?host= as the Unix socket directory — bypasses all Sequelize normalization
      `postgres://${config.username}:${encodeURIComponent(config.password)}@/${config.database}?host=${config.host}`,
      {
        dialect: 'postgres',
        logging: config.logging,
        pool: config.pool,
        define: config.define,
      }
    )
  : new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        dialect: config.dialect,
        host: config.host,
        port: config.port,
        logging: config.logging,
        pool: config.pool,
        define: config.define,
        dialectOptions: config.dialectOptions || {},
      }
    );
/*
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
            host: config.host, // ✅ Cloud SQL socket
          },
        }
      : {
          host: config.host,
          port: config.port,
          dialectOptions: config.dialectOptions || {},
        }),
  }
);*/

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