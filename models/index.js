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
    caConfig: {
        caCount: {
            type: Number,
            enum: [2, 3],
            default: 3,
        },
        caMaxScores: {
            type: [Number],
            default: [10, 10, 20],
        },
        examMaxScore: {
            type: Number,
            default: 70,
        },
    },
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
    session: {
        type: String,
        required: true,
    },
    term: {
        type: String,
        required: true,
    },
    startDate: Date,
    endDate: Date,
    isCurrent: {
        type: Boolean,
        default: false,
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
    publishedAt: {
        type: Date,
    },
    resultsLocked: {
        type: Boolean,
        default: false,
    },
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
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'graduated', 'left']
    },
    promotionHistory: [
        {
            fromClassId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Class'
            },
            toClassId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Class'
            },
            cycleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'AcademicCycle'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ]
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
    ca3: Number,
    exam: Number,
    total: Number,
    grade: String,
    remark: String,
    isLocked: {
        type: Boolean,
        default: false
    }
})


const parentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    password: {
        type: String,
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

parentSchema.index({ schoolId: 1, email: 1 }, { unique: true })


const notificationSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    cycleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicCycle'
    },
    type: {
        type: String,
        enum: ['result_published', 'message', 'at_risk', 'system'],
        default: 'system'
    },
    title: String,
    message: String,
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})


const messageSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    senderType: {
        type: String,
        enum: ['parent', 'school']
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId
    },
    receiverType: {
        type: String,
        enum: ['parent', 'school']
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId
    },
    body: String,
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})


const School = mongoose.model('School', schoolSchema)
const User = mongoose.model('User', userSchema)
const AcademicCycle = mongoose.model('AcademicCycle', academicCycleSchema)
const Class = mongoose.model('Class', classSchema)
const Student = mongoose.model('Student', studentSchema)
const Subject = mongoose.model('Subject', subjectSchema)
const Score = mongoose.model('Score', scoreSchema)
const Parent = mongoose.model('Parent', parentSchema)
const Notification = mongoose.model('Notification', notificationSchema)
const Message = mongoose.model('Message', messageSchema)

module.exports = { School, User, AcademicCycle, Class, Student, Subject, Score, Parent, Notification, Message }