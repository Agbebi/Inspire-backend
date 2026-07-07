const mongoose = require("mongoose");


const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    logoUrl: String,
    address: String,
    supportEmail: String,
    subDomain: String,
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    },
    gradingScale: [
        {
            grade: {
                type: String,
                enum: ['A', 'B', 'C', 'D', 'F'],
            },
            minScore: Number,
            maxScore: Number,
            remark: String
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now()
    }
})


const userSchema = new mongoose.Schema({
    schoolId : {
        type: mongoose.Types.ObjectId,
        ref: 'School',
    },
    name: {
        type: String,
        required: true,
    },
    email: String,
    password: String,
    role: String,
    assignedSubjects: [
        {
            classId: {
                type: mongoose.Types.ObjectId,
                ref: 'Class'
            },
            subjectId: {
                type: mongoose.Types.ObjectId,
                ref: 'Subject'
            }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    }
})




const School = mongoose.model('School', schoolSchema)
const User = mongoose.model('User', userSchema)


module.exports = {School, User}