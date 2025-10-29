# Database Data Export/Import Guide

This guide explains how to export and import database data across team members' local environments.

## Overview

The data export/import scripts allow team members to:
- Export their local database data to JSON files
- Share those files via Git
- Import the shared data into their own local database

## Scripts Location

- Export script: `scripts/export-data.js`
- Import script: `scripts/import-data.js`
- Data storage: `data/` directory

## Quick Start

### Exporting Data (Person A - has the data)

1. Make sure your database is running and populated with data
2. Run the export command:
   ```bash
   npm run export-data
   ```
3. This creates JSON files in the `data/` directory for all tables
4. Commit and push the `data/` folder to Git:
   ```bash
   git add data/
   git commit -m "Export database data for team"
   git push
   ```

### Importing Data (Person B - wants the data)

1. Pull the latest changes from Git:
   ```bash
   git pull
   ```
2. Make sure your database is running
3. Run the import command:
   ```bash
   npm run import-data
   ```
4. Your local database will now have the same data

## Available Commands

### Export Command
```bash
npm run export-data
```
Exports all table data from your database to JSON files in the `data/` directory.

**What it does:**
- Reads all records from each table
- Saves them as JSON files (one file per table)
- Creates a metadata file with export information
- Respects foreign key dependencies (exports in correct order)

**Output:**
- `data/organization.json`
- `data/user.json`
- `data/clinic.json`
- ... (one file per table)
- `data/_metadata.json` (export information)

### Import Commands

#### 1. Replace Mode (Default)
```bash
npm run import-data
```
**WARNING:** This clears all existing data and imports fresh data from JSON files.

Use this when you want to completely replace your local data with the exported data.

#### 2. Append Mode
```bash
npm run import-data:append
```
Adds data from JSON files WITHOUT clearing existing data. Skips duplicate records.

Use this when you want to add new records while keeping your existing data.

#### 3. Skip Existing Mode
```bash
npm run import-data:skip
```
Only imports records that don't already exist (based on primary key). Keeps existing records unchanged.

Use this for selective updates.

## Workflow Example

### Scenario: Team member adds test patients

**Team Member A (has new data):**
```bash
# 1. Add/update data in local database through the application
# 2. Export the data
npm run export-data

# 3. Commit and push
git add data/
git commit -m "Add test patient data for testing"
git push
```

**Team Member B (wants the data):**
```bash
# 1. Pull the changes
git pull

# 2. Import the data (choose one):
npm run import-data              # Replace all data
npm run import-data:append       # Add to existing data
npm run import-data:skip         # Only import new records

# 3. Start using the data
npm start
```

## Table Export/Import Order

The scripts handle foreign key dependencies automatically by processing tables in this order:

1. Organization
2. User
3. Clinic
4. Room
5. Patient
6. Staff
7. Admission
8. Task
9. Vital
10. Scan
11. Notification
12. ComplianceAlert
13. Camera
14. CVDetection
15. CVEvent
16. MP4File
17. MP4Event
18. AnalyticsEvent
19. DeviceLog
20. UserSession
21. Counter

## Important Notes

### File Exclusions
- The `uploads/` directory (containing uploaded files) is NOT exported
- Only database records are exported as JSON
- If your data references uploaded files, you'll need to share the `uploads/` folder separately (or ignore large files)

### Git Considerations
- The `data/` folder is tracked by Git by default
- If your JSON files become very large (>10MB), consider:
  - Using Git LFS (Large File Storage)
  - Sharing data files through other means (cloud storage)
  - Uncommenting the ignore rules in `.gitignore`:
    ```gitignore
    data/*.json
    !data/.gitkeep
    ```

### Database Setup
Before importing data, ensure:
1. Your database is running
2. You've run migrations: `npm run migrate`
3. Your `.env` file has correct database credentials

### Sensitive Data Warning
**IMPORTANT:** Exported data may contain sensitive information:
- User passwords (even if hashed)
- Personal information
- API keys or tokens stored in the database

**Best practices:**
- Only share data in private repositories
- Consider sanitizing sensitive data before export
- Use environment-specific data (test data vs. production data)
- Never commit production data to Git

## Troubleshooting

### "Data directory not found"
Run the export script first: `npm run export-data`

### Foreign Key Constraint Errors
The scripts handle this automatically, but if you see errors:
- Use replace mode: `npm run import-data`
- Ensure migrations are up to date: `npm run migrate`

### Duplicate Key Errors
- Use append mode: `npm run import-data:append`
- Or skip existing: `npm run import-data:skip`

### Connection Errors
Check your `.env` file database configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

## Advanced Usage

### Custom Data Selection
To export/import specific tables only, you can modify the `EXPORT_ORDER` and `IMPORT_ORDER` arrays in the scripts.

### Direct Script Execution
You can also run the scripts directly:
```bash
node scripts/export-data.js
node scripts/import-data.js
node scripts/import-data.js --append
node scripts/import-data.js --skip-existing
```

## Support

If you encounter issues:
1. Check this guide
2. Verify your database connection
3. Ensure migrations are up to date
4. Check the console output for specific error messages

## Contributing

When adding new tables:
1. Add the model to `models/index.js`
2. Update `EXPORT_ORDER` and `IMPORT_ORDER` in both scripts
3. Respect foreign key dependencies in the order
4. Test export and import with the new table
