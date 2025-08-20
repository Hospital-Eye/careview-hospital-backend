const mongoose = require('mongoose');
const { Schema } = mongoose;

const admissionSchema = new Schema({
    patientId: {type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true},

    checkInTime: {type: Date, required: true, default: Date.now},

    admissionDate: {type: Date, default: Date.now},

    reportSentTime: {type: Date, default: null},

    dischargeDate: {type: Date, default: null},

    currentWorkflowStage: {
        type: String,
        enum: [
            'Checked-In',
            'In Preparation', 
            'In Thermal',
            'In CT',
            'Awaiting Results',
            'Review with Physician',
            'Report Sent',
            'Discharged',
            'Canceled', 
            'On Hold'   
        ],
        default: 'Checked-In',
        required: true
    },

    acuityLevel: {
        type: Number,
        required: true
    },

    status: {           
        type: String,
        enum: ['Active', 'Completed', 'Canceled', 'On Hold'],
        default: 'Active',
        required: true
    },

    admittedByStaffId: {type: Schema.Types.ObjectId, ref: 'Staff', default: null},

    attendingPhysicianId: {type: Schema.Types.ObjectId, ref: 'Staff', default: null},

    admissionReason: {type: String, required: true},

    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

    diagnoses: [{type: String}],

    carePlan: {
    notes: {
      type: String,
    },
    medicationSchedule: [
      {
        name: { type: String },
        rxnorm: { type: String },
        dosage: { type: String },
        route: { type: String },
        frequency: { type: String },
      }
    ],
    scheduledProcedures: [
      {
        name: { type: String },
        datetime: { type: Date },
        status: { type: String },
        cpt: { type: String },
      }
    ],
  },

  documentation: [{
    type: String,
  }],

  dietaryRestrictions: {
    type: String,
  },
},

  {timestamps: true });

// Add indexes for efficient querying for dashboard KPIs
admissionSchema.index({ status: 1, checkInTime: -1 }); // For filtering active/completed by date
admissionSchema.index({ currentWorkflowStage: 1, updatedAt: -1 }); // For active cases by stage

module.exports = mongoose.model('Admission', admissionSchema);