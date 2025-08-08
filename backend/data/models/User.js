const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    // --- Google-specific Identifiers (for linking to Google account) ---
    googleId: {         
        type: String,
        unique: true,   
        sparse: true    
    },
    email: {            
        type: String,
        required: true,
        unique: true,   
        lowercase: true,
        trim: true
    },
    name: {             
        type: String,
        required: true
    },
    profilePicture: {   
        type: String
    },

    
    role: {             
        type: String,
        enum: ['admin', 'doctor', 'nurse', 'patient'], // Define allowed roles
        default: 'nurse', 
        required: true
    },

    isActive: {         
        type: Boolean,
        default: true,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now 
    }

}, { timestamps: true }); 

module.exports = mongoose.model('User', userSchema);