# Controller Migration Guide: Mongoose to Sequelize

## Quick Reference

### Common Patterns

#### 1. **Imports**

```javascript
// BEFORE (Mongoose)
const Patient = require('../models/Patient');
const User = require('../models/User');

// AFTER (Sequelize)
const { Patient, User, Admission, Staff } = require('../models');
const { Op } = require('sequelize'); // For advanced queries
const { sequelize } = require('../config/db'); // For transactions
```

#### 2. **Find by ID**

```javascript
// BEFORE
const patient = await Patient.findById(id);

// AFTER
const patient = await Patient.findByPk(id);
```

#### 3. **Find One**

```javascript
// BEFORE
const user = await User.findOne({ email: 'test@test.com' });

// AFTER
const user = await User.findOne({
  where: { email: 'test@test.com' }
});
```

#### 4. **Find All / Find Many**

```javascript
// BEFORE
const patients = await Patient.find({ clinicId: 'clinic123' });

// AFTER
const patients = await Patient.findAll({
  where: { clinicId: 'clinic123' }
});
```

#### 5. **Find with Population/Joins**

```javascript
// BEFORE
const admission = await Admission.findById(id)
  .populate('patientId')
  .populate('admittedByStaffId');

// AFTER
const admission = await Admission.findByPk(id, {
  include: [
    { model: Patient, as: 'patient' },
    { model: Staff, as: 'admittedByStaff' }
  ]
});
```

#### 6. **Create Document**

```javascript
// BEFORE
const patient = new Patient(req.body);
await patient.save();

// OR
const patient = await Patient.create(req.body);

// AFTER
const patient = await Patient.create(req.body);
```

#### 7. **Update Document**

```javascript
// BEFORE
patient.name = 'New Name';
await patient.save();

// OR
await Patient.findByIdAndUpdate(id, { name: 'New Name' });

// AFTER
patient.name = 'New Name';
await patient.save();

// OR
await Patient.update(
  { name: 'New Name' },
  { where: { id } }
);
```

#### 8. **Delete Document**

```javascript
// BEFORE
await Patient.findByIdAndDelete(id);

// OR
await patient.remove();

// AFTER
await Patient.destroy({
  where: { id }
});

// OR
await patient.destroy();
```

#### 9. **Count Documents**

```javascript
// BEFORE
const count = await Patient.countDocuments({ clinicId });

// AFTER
const count = await Patient.count({
  where: { clinicId }
});
```

#### 10. **Advanced Queries with Operators**

```javascript
// BEFORE
const patients = await Patient.find({
  age: { $gte: 18, $lte: 65 },
  status: { $in: ['Active', 'Pending'] }
});

// AFTER
const patients = await Patient.findAll({
  where: {
    age: {
      [Op.gte]: 18,
      [Op.lte]: 65
    },
    status: {
      [Op.in]: ['Active', 'Pending']
    }
  }
});
```

#### 11. **Sorting**

```javascript
// BEFORE
const patients = await Patient.find().sort({ createdAt: -1 });

// AFTER
const patients = await Patient.findAll({
  order: [['createdAt', 'DESC']]
});
```

#### 12. **Limit and Offset (Pagination)**

```javascript
// BEFORE
const patients = await Patient.find()
  .skip(20)
  .limit(10);

// AFTER
const patients = await Patient.findAll({
  offset: 20,
  limit: 10
});
```

#### 13. **Select Specific Fields**

```javascript
// BEFORE
const patients = await Patient.find().select('name email mrn');

// AFTER
const patients = await Patient.findAll({
  attributes: ['name', 'email', 'mrn']
});
```

#### 14. **Transactions**

```javascript
// BEFORE (Mongoose has limited transaction support)
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Patient.create([data], { session });
  await Admission.create([admData], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
} finally {
  session.endSession();
}

// AFTER (Sequelize has full transaction support)
const t = await sequelize.transaction();
try {
  const patient = await Patient.create(data, { transaction: t });
  await Admission.create(admData, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

#### 15. **ObjectId to UUID Validation**

```javascript
// BEFORE
const mongoose = require('mongoose');
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}

// AFTER
const { validate: isUUID } = require('uuid');
if (!isUUID(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}
```

#### 16. **Accessing ID Field**

```javascript
// BEFORE
const patientId = patient._id;

// AFTER
const patientId = patient.id;
```

---

## Sequelize Query Operators

Import operators:
```javascript
const { Op } = require('sequelize');
```

| Mongoose | Sequelize | Description |
|----------|-----------|-------------|
| `$eq` | `Op.eq` | Equal |
| `$ne` | `Op.ne` | Not equal |
| `$gt` | `Op.gt` | Greater than |
| `$gte` | `Op.gte` | Greater than or equal |
| `$lt` | `Op.lt` | Less than |
| `$lte` | `Op.lte` | Less than or equal |
| `$in` | `Op.in` | In array |
| `$nin` | `Op.notIn` | Not in array |
| `$like` | `Op.like` | SQL LIKE |
| `$iLike` | `Op.iLike` | Case-insensitive LIKE |
| `$regex` | `Op.regexp` | Regular expression |
| `$and` | `Op.and` | Logical AND |
| `$or` | `Op.or` | Logical OR |
| `$not` | `Op.not` | Logical NOT |

---

## Example: patientController.js Migration

### Before (Mongoose)

```javascript
const Patient = require('../models/Patient');
const User = require('../models/User');
const Admission = require('../models/Admission');

// Get all patients
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ clinicId: req.user.clinicId })
      .populate('userId')
      .sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single patient
const getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('userId');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create patient
const createPatient = async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### After (Sequelize)

```javascript
const { Patient, User, Admission } = require('../models');
const { Op } = require('sequelize');

// Get all patients
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll({
      where: { clinicId: req.user.clinicId },
      include: [
        { model: User, as: 'user' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single patient
const getPatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' }
      ]
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create patient
const createPatient = async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

---

## Controllers to Update (18 Files)

### Priority 1: Core Patient Flow
1. ✅ `patientController.js` - See example above
2. ⏳ `admissionController.js` - High complexity (transactions needed)
3. ⏳ `vitalController.js` - Medium complexity
4. ⏳ `scanController.js` - Medium complexity

### Priority 2: Staff & Tasks
5. ⏳ `staffController.js` - Medium complexity
6. ⏳ `taskController.js` - Medium complexity
7. ⏳ `roomController.js` - Low complexity

### Priority 3: System & Analytics
8. ⏳ `userController.js` - Low complexity
9. ⏳ `clinicController.js` - Low complexity
10. ⏳ `notificationController.js` - Low complexity
11. ⏳ `complianceAlertController.js` - Medium complexity
12. ⏳ `deviceLogController.js` - Low complexity
13. ⏳ `analyticsEventController.js` - Low complexity
14. ⏳ `dashboardController.js` - High complexity (aggregations)

### Priority 4: CV & Media
15. ⏳ `cameraController.js` - Low complexity
16. ⏳ `cvDetectionController.js` - Medium complexity
17. ⏳ `cvAnalyticsController.js` - High complexity (aggregations)
18. ⏳ `managementController.js` - Medium complexity

---

## Testing Each Controller

1. **Update controller file**
2. **Test with curl/Postman**:
   ```bash
   # Example: Test patient endpoints
   curl http://localhost:8080/api/patients
   curl http://localhost:8080/api/patients/{uuid}
   curl -X POST http://localhost:8080/api/patients -H "Content-Type: application/json" -d '{...}'
   ```
3. **Check for errors in server logs**
4. **Verify data in PostgreSQL**:
   ```sql
   SELECT * FROM "Patient" LIMIT 10;
   ```

---

## Common Pitfalls

1. **Forgetting `where` clause** - Sequelize requires explicit `where` for filtering
2. **Wrong association names** - Use `as` property defined in model associations
3. **Array defaults** - PostgreSQL arrays use `{}` not `[]` in defaults
4. **JSONB fields** - Access properties: `patient.emergencyContact.name` (same as Mongoose)
5. **Enum values** - Must match exactly (case-sensitive)
6. **Transaction handling** - Always use try/catch with rollback

---

## Next Steps

1. Start with **patientController.js** (Priority 1)
2. Test thoroughly after each controller update
3. Update one controller at a time
4. Commit changes after each successful migration
5. Run validation tests: `node scripts/validate-migration.js`

Good luck! 🚀
