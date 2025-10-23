# MongoDB to PostgreSQL Migration Guide

## Table of Contents
1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Database Setup](#database-setup)
6. [Running Migrations](#running-migrations)
7. [Data Migration](#data-migration)
8. [Configuration](#configuration)
9. [Controller Updates](#controller-updates)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Plan](#rollback-plan)

---

## Overview

The Hospital Eye backend has been migrated from **MongoDB (Mongoose)** to **PostgreSQL (Sequelize)**. This migration provides:

- ✅ **ACID compliance** with transactions
- ✅ **Better data integrity** with foreign keys
- ✅ **UUID-based primary keys** for scalability
- ✅ **Production-ready migrations** with rollback support
- ✅ **Automatic cleanup** for time-series data (CVEvent, MP4Event)
- ✅ **22 models** successfully converted

---

## What Changed

### Database Structure
- **Database**: MongoDB → PostgreSQL 12+
- **ORM**: Mongoose → Sequelize 6.x
- **Primary Keys**: MongoDB ObjectId → UUID v4
- **Relationships**: Virtual populations → Foreign key constraints
- **TTL**: MongoDB TTL indexes → Node-cron cleanup jobs
- **Timestamps**: Automatic `createdAt`, `updatedAt` fields

### File Changes

#### New Files
```
.env.example                           # Example environment configuration
.sequelizerc                           # Sequelize CLI configuration
config/sequelize.js                    # Sequelize database config
models/index.js                        # Central model loader with associations
migrations/20250101000000-create-all-tables.js  # Database schema migration
utils/cleanup-cron.js                  # TTL cleanup cron job
scripts/migrate-mongodb-to-postgres.js # Data migration script
scripts/validate-migration.js          # Validation script
MIGRATION_README.md                    # This file
```

#### Modified Files
```
package.json                # Added PostgreSQL dependencies
config/db.js                # Replaced Mongoose with Sequelize connection
server.js                   # Added Sequelize initialization and cron job
models/*.js                 # All 22 models converted to Sequelize
```

#### Backup Files
All original Mongoose models are preserved as `.mongoose.js` files for reference:
```
models/User.mongoose.js
models/Patient.mongoose.js
... (20 more files)
```

---

## Prerequisites

### Software Requirements
- **Node.js**: 16.x or higher
- **PostgreSQL**: 12.x or higher
- **npm**: 7.x or higher

### PostgreSQL Installation

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Verify PostgreSQL Installation
```bash
psql --version
# Should output: psql (PostgreSQL) 12.x or higher
```

---

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `sequelize` - PostgreSQL ORM
- `pg` - PostgreSQL client
- `pg-hstore` - PostgreSQL data serialization
- `uuid` - UUID generation
- `node-cron` - Cron job scheduler
- `sequelize-cli` - Migration tool (dev dependency)

### 2. Create PostgreSQL Database

Connect to PostgreSQL:
```bash
# On Windows/macOS/Linux
psql -U postgres
```

Create database:
```sql
CREATE DATABASE hospital_eye;
\q
```

Or use the command line:
```bash
createdb -U postgres hospital_eye
```

---

## Database Setup

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the `.env` file with your PostgreSQL credentials:

```env
# Database Type
DB_TYPE=postgresql

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=hospital_eye
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here

# Optional: Comment out MongoDB URI (keep for data migration)
# MONGODB_URI=mongodb+srv://...

# Other configurations remain the same
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
PORT=8080
NODE_ENV=development
```

### 2. Test Database Connection

```bash
psql -h localhost -U postgres -d hospital_eye -c "SELECT version();"
```

You should see the PostgreSQL version printed.

---

## Running Migrations

### 1. Run Database Migrations

This creates all 22 tables with proper schema:

```bash
npm run migrate
```

Or using Sequelize CLI directly:
```bash
npx sequelize-cli db:migrate
```

**Expected output:**
```
Sequelize CLI [Node: 16.x.x, CLI: 6.x.x, ORM: 6.x.x]

Loaded configuration file "config/sequelize.js".
Using environment "development".
== 20250101000000-create-all-tables: migrating =======
== 20250101000000-create-all-tables: migrated (0.523s)
```

### 2. Verify Tables Created

```bash
psql -U postgres -d hospital_eye -c "\dt"
```

You should see 22 tables:
```
 Schema |      Name       | Type  |  Owner
--------+-----------------+-------+----------
 public | User            | table | postgres
 public | Organization    | table | postgres
 public | Clinic          | table | postgres
 public | Patient         | table | postgres
 ... (18 more tables)
```

### 3. Check Migration Status

```bash
npm run migrate:status
```

---

## Data Migration

If you have existing data in MongoDB, migrate it to PostgreSQL:

### 1. Ensure MongoDB Connection

Make sure `MONGODB_URI` is still in your `.env` file:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/Hospital_Eye
```

### 2. Run Data Migration Script

```bash
node scripts/migrate-mongodb-to-postgres.js
```

**What this does:**
- Connects to both MongoDB and PostgreSQL
- Exports all data from MongoDB
- Transforms ObjectIds to UUIDs
- Imports data to PostgreSQL with proper foreign key relationships
- Maintains referential integrity

**Expected output:**
```
📊 Connecting to MongoDB...
✅ MongoDB connected
🐘 Connecting to PostgreSQL...
✅ PostgreSQL connected

═══════════════════════════════════════════════
  MongoDB to PostgreSQL Data Migration
═══════════════════════════════════════════════

🔄 Migrating User...
   Found 150 documents
   ✅ 150 migrated, ❌ 0 errors

🔄 Migrating Patient...
   Found 3247 documents
   ✅ 3247 migrated, ❌ 0 errors

... (20 more models)

✅ Migration completed successfully!
```

### 3. Validate Migration

```bash
node scripts/validate-migration.js
```

This compares record counts between MongoDB and PostgreSQL:

```
═══════════════════════════════════════════════
  Migration Validation Report
═══════════════════════════════════════════════

Model                 │ MongoDB │ PostgreSQL │ Status
────────────────────────────────────────────────────────
User                  │     150 │        150 │ ✅
Patient               │    3247 │       3247 │ ✅
Admission             │    1523 │       1523 │ ✅
... (18 more models)

✅ All record counts match! Migration validated successfully.
```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_TYPE` | Database type | `postgresql` | Yes |
| `POSTGRES_HOST` | PostgreSQL server host | `localhost` | Yes |
| `POSTGRES_PORT` | PostgreSQL server port | `5432` | Yes |
| `POSTGRES_DB` | Database name | `hospital_eye` | Yes |
| `POSTGRES_USER` | Database user | `postgres` | Yes |
| `POSTGRES_PASSWORD` | Database password | - | Yes |
| `CLEANUP_CRON_SCHEDULE` | Cron schedule for event cleanup | `0 */6 * * *` | No |
| `EVENT_TTL_HOURS` | TTL for CVEvent/MP4Event | `72` | No |
| `NODE_ENV` | Environment | `development` | No |

### Cron Job Schedule

The cleanup cron job runs on a schedule defined by `CLEANUP_CRON_SCHEDULE`:

```env
# Every 6 hours (default)
CLEANUP_CRON_SCHEDULE=0 */6 * * *

# Daily at midnight
CLEANUP_CRON_SCHEDULE=0 0 * * *

# Every hour
CLEANUP_CRON_SCHEDULE=0 * * * *
```

Format: `minute hour day month dayOfWeek`

---

## Controller Updates

⚠️ **Important**: Controllers need to be updated to use Sequelize syntax instead of Mongoose.

### Key Syntax Changes

| Mongoose | Sequelize |
|----------|-----------|
| `Model.find()` | `Model.findAll()` |
| `Model.findById(id)` | `Model.findByPk(id)` |
| `Model.findOne({ email })` | `Model.findOne({ where: { email } })` |
| `new Model(data).save()` | `Model.create(data)` |
| `model.save()` | `model.save()` |
| `.populate('user')` | `{ include: [{ model: User, as: 'user' }] }` |
| `doc._id` | `doc.id` |
| `mongoose.Types.ObjectId.isValid()` | UUID validation |

### Example Controller Migration

**Before (Mongoose):**
```javascript
const Patient = require('../models/Patient');

// Find by ID
const patient = await Patient.findById(req.params.id).populate('user');

// Find all
const patients = await Patient.find({ clinicId: req.user.clinicId });

// Create
const newPatient = new Patient(req.body);
await newPatient.save();
```

**After (Sequelize):**
```javascript
const { Patient, User } = require('../models');

// Find by ID with association
const patient = await Patient.findByPk(req.params.id, {
  include: [{ model: User, as: 'user' }]
});

// Find all with where clause
const patients = await Patient.findAll({
  where: { clinicId: req.user.clinicId }
});

// Create
const newPatient = await Patient.create(req.body);
```

### Controllers Requiring Updates

The following 18 controllers need Sequelize syntax updates:

1. `patientController.js`
2. `admissionController.js`
3. `staffController.js`
4. `roomController.js`
5. `taskController.js`
6. `vitalController.js`
7. `scanController.js`
8. `cameraController.js`
9. `cvDetectionController.js`
10. `cvAnalyticsController.js`
11. `complianceAlertController.js`
12. `clinicController.js`
13. `deviceLogController.js`
14. `notificationController.js`
15. `analyticsEventController.js`
16. `managementController.js`
17. `dashboardController.js`
18. `userController.js`

**Note**: These controllers are marked for manual review and updates. See [Controller Update Guide](#controller-update-guide) below.

---

## Testing

### 1. Start the Server

```bash
npm start
```

**Expected output:**
```
✅ PostgreSQL connected successfully
🕒 Initializing cleanup cron job
   Schedule: 0 */6 * * *
   TTL: 72 hours
✅ Cleanup cron job initialized successfully
🚀 Server running on port 8080
```

### 2. Test Database Connection

Visit: http://localhost:8080/

You should see: `Hospital Eye API Running`

### 3. Test API Endpoints

Example API tests:

```bash
# Get all patients
curl http://localhost:8080/api/patients

# Get single patient
curl http://localhost:8080/api/patients/{id}

# Create patient (requires auth)
curl -X POST http://localhost:8080/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name": "John Doe", "mrn": "MRN12345", ...}'
```

---

## Troubleshooting

### Issue: "Cannot find module './models'"

**Solution**: Ensure `models/index.js` exists and all model files are in place.

```bash
ls models/
# Should show: index.js, User.js, Patient.js, ... (22 model files)
```

### Issue: "relation does not exist"

**Solution**: Run migrations:

```bash
npm run migrate
```

### Issue: "password authentication failed"

**Solution**: Check PostgreSQL credentials in `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_correct_password
```

Test connection:
```bash
psql -U postgres -h localhost -d hospital_eye
```

### Issue: "uuid_generate_v4() does not exist"

**Solution**: Enable UUID extension manually:

```bash
psql -U postgres -d hospital_eye -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Issue: Cleanup cron job not running

**Solution**: Check cron schedule format and ensure server is running:

```env
# Valid format: minute hour day month dayOfWeek
CLEANUP_CRON_SCHEDULE=0 */6 * * *
```

### Issue: Migration foreign key errors

**Solution**: Ensure migration order follows dependency chain. The migration script handles this automatically.

---

## Rollback Plan

If you need to revert to MongoDB:

### 1. Stop the Server

```bash
# Kill Node.js process
# Ctrl+C or kill <pid>
```

### 2. Restore Mongoose Models

```bash
# Remove Sequelize models and restore Mongoose models
cd models
for file in *.mongoose.js; do mv "$file" "${file%.mongoose.js}.js"; done
```

### 3. Restore config/db.js

```javascript
// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 4. Update server.js

```javascript
// server.js
const connectDB = require('./config/db');

dotenv.config();
connectDB();  // Remove .then() and cleanup cron

// Remove these lines:
// const db = require('./models');
// const { initCleanupCron } = require('./utils/cleanup-cron');
```

### 5. Update .env

```env
DB_TYPE=mongodb
# Uncomment MongoDB URI
MONGODB_URI=mongodb+srv://...
```

### 6. Reinstall Mongoose

```bash
npm install mongoose@8.15.2
```

### 7. Restart Server

```bash
npm start
```

---

## Controller Update Guide

### Step-by-Step Process

1. **Open Controller File**
2. **Update Imports**
   ```javascript
   // OLD
   const Patient = require('../models/Patient');

   // NEW
   const { Patient } = require('../models');
   ```

3. **Update Queries**
   - Find operations → Add `where` clause
   - Populate → Add `include`
   - ObjectId validation → UUID validation

4. **Update Transactions** (if applicable)
   ```javascript
   const t = await sequelize.transaction();
   try {
     await Patient.create(data, { transaction: t });
     await Admission.create(admissionData, { transaction: t });
     await t.commit();
   } catch (error) {
     await t.rollback();
     throw error;
   }
   ```

5. **Test Endpoint** - Use Postman/curl to verify

6. **Repeat for all 18 controllers**

---

## Additional Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize CLI Guide](https://github.com/sequelize/cli)
- [UUID Best Practices](https://www.npmjs.com/package/uuid)

---

## Migration Checklist

- [ ] PostgreSQL installed and running
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database created (`hospital_eye`)
- [ ] Migrations run (`npm run migrate`)
- [ ] Tables verified (22 tables exist)
- [ ] Data migrated (if applicable)
- [ ] Migration validated (all counts match)
- [ ] Server starts successfully
- [ ] Cleanup cron job initialized
- [ ] Controllers updated (18 files)
- [ ] API endpoints tested
- [ ] Production deployment ready

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Sequelize docs: https://sequelize.org/docs/v6/
3. Check migration logs in `console.log` output

---

**Last Updated**: 2025-01-22
**Migration Version**: 1.0.0
**Database Schema Version**: 20250101000000
