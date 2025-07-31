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
    status: {           
        type: String,
        enum: ['Active', 'Completed', 'Canceled', 'On Hold'],
        default: 'Active',
        required: true
    },

    admittedByStaffId: {type: Schema.Types.ObjectId, ref: 'Staff', default: null},

    assignedRoomId: {type: Schema.Types.ObjectId, ref: 'Room', default: null},

    attendingPhysicianId: {type: Schema.Types.ObjectId, ref: 'Staff', default: null},

    admissionReason: {type: String, required: true},

    initialDiagnoses: [{type: String}],

    notes: String,      

}, 

{ timestamps: true }); 

// Add indexes for efficient querying for dashboard KPIs
admissionSchema.index({ status: 1, checkInTime: -1 }); // For filtering active/completed by date
admissionSchema.index({ currentWorkflowStage: 1, updatedAt: -1 }); // For active cases by stage

module.exports = mongoose.model('Admission', admissionSchema);