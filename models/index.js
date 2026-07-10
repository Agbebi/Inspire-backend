const mongoose = require("mongoose");


const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    logoUrl: String,
    motto: String,
    address: String,
    supportEmail: String,
    subDomain: {
        type: String,
        required: true
    },
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
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
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
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Class'
            },
            subjectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject'
            }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    }
})

const academicCycleSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
    },
    session: String,
    term: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean
})

const classSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
    },
    name: String,
    arm: String,
    subjects: [mongoose.Schema.Types.ObjectId],
})


const studentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
    },
    firstName: {
        type: String,
        required: true,
    },
    middleName: String,
    lastName: {
        type: String,
        required: true,
    },
    email: String,
    accessPin: {
        type: Number,
        unique: true
    },
    currentClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
    },
    admissionNumber: {
        type: String,  //E.g SCH/2026/001
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'graduated', 'left']
    }
})


const subjectSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    name: String,
    code: String
})


const scoreSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    cycleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicCycle'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    classsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ca1: Number,
    ca2: Number,
    exam: Number,
    total: Number,
    grade: String,
    remark: String,
    isLocked: {
        type: Boolean,
        default: false
    }
})



const School = mongoose.model('School', schoolSchema)
const User = mongoose.model('User', userSchema)
const AcademicCycle = mongoose.model('AcademicCycle', academicCycleSchema)
const Class = mongoose.model('Class', classSchema)
const Student = mongoose.model('Student', studentSchema)
const Subject = mongoose.model('Subject', subjectSchema)
const Score = mongoose.model('Score', scoreSchema)

module.exports = { School, User, AcademicCycle, Class, Student, Subject, Score }