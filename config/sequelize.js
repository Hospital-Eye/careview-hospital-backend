require('dotenv').config();

module.exports = {
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    dialect: 'postgres',
    logging: false,

    dialectOptions: {
      socketPath: process.env.POSTGRES_HOST, 
    },

    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },

    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  },
};