const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema({
    organizationId: { type: String, required: true },
    clinicId: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    mrn: { type: String, required: true},
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },

    scanType: { type: String, 
                enum: [ 'Brain CT', 'Chest CT', 'Abdominal CT', 'Pelvic CT', 'Spine CT', 'Other' ],
                required: true
            },
    
    urgencyLevel: { type: String,
                    enum: [ 'Routine', 'Urgent', 'Critical' ]
                },

    status: { 
        type: String, 
        enum: ['Pending Review', 'Reviewed', 'Archived'], 
        default: 'Pending Review' 
    },

    // store relative path
    fileUrl: { type: String, required: true }, 

    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Scan", scanSchema);
