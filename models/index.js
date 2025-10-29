const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import all models
db.User = require('./User')(sequelize, DataTypes);
db.Organization = require('./Organization')(sequelize, DataTypes);
db.Clinic = require('./Clinic')(sequelize, DataTypes);
db.Patient = require('./Patient')(sequelize, DataTypes);
db.Staff = require('./Staff')(sequelize, DataTypes);
db.Room = require('./Room')(sequelize, DataTypes);
db.Admission = require('./Admission')(sequelize, DataTypes);
db.Task = require('./Task')(sequelize, DataTypes);
db.Vital = require('./Vital')(sequelize, DataTypes);
db.Scan = require('./Scan')(sequelize, DataTypes);
db.Notification = require('./Notification')(sequelize, DataTypes);
db.ComplianceAlert = require('./ComplianceAlert')(sequelize, DataTypes);
db.Camera = require('./Camera')(sequelize, DataTypes);
db.CVDetection = require('./CVDetection')(sequelize, DataTypes);
db.CVEvent = require('./CVEvent')(sequelize, DataTypes);
db.MP4File = require('./MP4File')(sequelize, DataTypes);
db.MP4Event = require('./MP4Event')(sequelize, DataTypes);
db.AnalyticsEvent = require('./AnalyticsEvent')(sequelize, DataTypes);
db.DeviceLog = require('./DeviceLog')(sequelize, DataTypes);
db.UserSession = require('./UserSession')(sequelize, DataTypes);
db.Counter = require('./Counter')(sequelize, DataTypes);

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

console.log('✅ Associations loaded:');
console.log(Object.keys(db.User.associations));

module.exports = db;
