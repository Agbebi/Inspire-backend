const bcrypt = require('bcryptjs')
const { School, User, AcademicCycle, Class, Student, Subject, Score } = require('../../models')

const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({ schoolId: req.user.schoolId })
            .sort({ name: 1 })
            .select('name code')
        return res.status(200).json({ success: true, data: subjects, message: 'Subjects fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addSubject = async (req, res) => {
    try {
        const { name, code } = req.body
        if (!name) {
            return res.status(400).json({ success: false, message: 'Subject name is required' })
        }
        const subject = new Subject({ schoolId: req.user.schoolId, name, code })
        await subject.save()
        return res.status(201).json({ success: true, data: subject, message: 'Subject added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateSubject = async (req, res) => {
    try {
        const { id } = req.params
        const { name, code } = req.body
        const subject = await Subject.findOneAndUpdate(
            { _id: id, schoolId: req.user.schoolId },
            { ...(name !== undefined && { name }), ...(code !== undefined && { code }) },
            { new: true }
        )
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found' })
        }
        return res.status(200).json({ success: true, data: subject, message: 'Subject updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params
        const subject = await Subject.findOneAndDelete({ _id: id, schoolId: req.user.schoolId })
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found' })
        }
        await Class.updateMany({ schoolId: req.user.schoolId }, { $pull: { subjects: id } })
        return res.status(200).json({ success: true, message: 'Subject deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getClasses = async (req, res) => {
    try {
        const classes = await Class.find({ schoolId: req.user.schoolId })
            .sort({ name: 1 })
            .populate('subjects', 'name code')
        const result = await Promise.all(classes.map(async (c) => {
            const studentCount = await Student.countDocuments({ schoolId: req.user.schoolId, currentClassId: c._id })
            return { ...c.toObject(), studentCount }
        }))
        return res.status(200).json({ success: true, data: result, message: 'Classes fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addClass = async (req, res) => {
    try {
        const { name, arm, subjects } = req.body
        if (!name) {
            return res.status(400).json({ success: false, message: 'Class name is required' })
        }
        const klass = new Class({ schoolId: req.user.schoolId, name, arm, subjects: subjects || [] })
        await klass.save()
        await klass.populate('subjects', 'name code')
        return res.status(201).json({ success: true, data: klass, message: 'Class added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateClass = async (req, res) => {
    try {
        const { id } = req.params
        const { name, arm, subjects } = req.body
        const klass = await Class.findOneAndUpdate(
            { _id: id, schoolId: req.user.schoolId },
            { ...(name !== undefined && { name }), ...(arm !== undefined && { arm }), ...(subjects !== undefined && { subjects }) },
            { new: true }
        )
        if (!klass) {
            return res.status(404).json({ success: false, message: 'Class not found' })
        }
        await klass.populate('subjects', 'name code')
        return res.status(200).json({ success: true, data: klass, message: 'Class updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteClass = async (req, res) => {
    try {
        const { id } = req.params
        const klass = await Class.findOneAndDelete({ _id: id, schoolId: req.user.schoolId })
        if (!klass) {
            return res.status(404).json({ success: false, message: 'Class not found' })
        }
        return res.status(200).json({ success: true, message: 'Class deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ schoolId: req.user.schoolId, role: 'teacher' })
            .sort({ name: 1 })
            .select('-password')
        return res.status(200).json({ success: true, data: teachers, message: 'Teachers fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addTeacher = async (req, res) => {
    try {
        const { name, email, password, assignedSubjects } = req.body
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' })
        }
        const existing = await User.findOne({ email })
        if (existing) {
            return res.status(403).json({ success: false, message: 'A user with this email already exists' })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const teacher = new User({
            schoolId: req.user.schoolId,
            name,
            email,
            password: hashedPassword,
            role: 'teacher',
            isActive: true,
            assignedSubjects: Array.isArray(assignedSubjects) ? assignedSubjects : [],
        })
        await teacher.save()
        const data = teacher.toObject()
        delete data.password
        return res.status(201).json({ success: true, data, message: 'Teacher added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, isActive, password, assignedSubjects } = req.body

        const teacher = await User.findOne({ _id: id, schoolId: req.user.schoolId, role: 'teacher' })
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }

        if (email && email !== teacher.email) {
            const existing = await User.findOne({ email })
            if (existing) {
                return res.status(403).json({ success: false, message: 'A user with this email already exists' })
            }
        }

        if (name !== undefined) teacher.name = name
        if (email !== undefined) teacher.email = email
        if (isActive !== undefined) teacher.isActive = isActive
        if (Array.isArray(assignedSubjects)) teacher.assignedSubjects = assignedSubjects

        if (password) {
            teacher.password = await bcrypt.hash(password, 10)
        }

        await teacher.save()
        const data = teacher.toObject()
        delete data.password
        return res.status(200).json({ success: true, data, message: 'Teacher updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params
        const teacher = await User.findOneAndDelete({ _id: id, schoolId: req.user.schoolId, role: 'teacher' })
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }
        return res.status(200).json({ success: true, message: 'Teacher deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getStudents = async (req, res) => {
    try {
        const { q, classId } = req.query
        const filter = { schoolId: req.user.schoolId }
        if (classId) {
            filter.currentClassId = classId
        }
        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), 'i')
            filter.$or = [
                { firstName: regex },
                { lastName: regex },
                { admissionNumber: regex },
                { email: regex },
            ]
        }
        const students = await Student.find(filter)
            .sort({ lastName: 1 })
            .populate('currentClassId', 'name arm')
        return res.status(200).json({ success: true, data: students, message: 'Students fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addStudent = async (req, res) => {
    try {
        const {
            firstName,
            middleName,
            lastName,
            email,
            accessPin,
            currentClassId,
            admissionNumber,
            status,
        } = req.body

        if (!firstName || !lastName || !admissionNumber) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name and admission number are required'
            })
        }

        const existing = await Student.findOne({ schoolId: req.user.schoolId, admissionNumber })
        if (existing) {
            return res.status(403).json({
                success: false,
                message: 'A student with this admission number already exists'
            })
        }

        const student = new Student({
            schoolId: req.user.schoolId,
            firstName,
            middleName,
            lastName,
            email,
            accessPin,
            currentClassId: currentClassId || null,
            admissionNumber,
            status: status || 'active',
        })
        await student.save()
        return res.status(201).json({ success: true, data: student, message: 'Student added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params
        const {
            firstName,
            middleName,
            lastName,
            email,
            accessPin,
            currentClassId,
            admissionNumber,
            status,
        } = req.body

        const student = await Student.findOne({ _id: id, schoolId: req.user.schoolId })
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' })
        }

        if (admissionNumber && admissionNumber !== student.admissionNumber) {
            const existing = await Student.findOne({ schoolId: req.user.schoolId, admissionNumber })
            if (existing) {
                return res.status(403).json({
                    success: false,
                    message: 'A student with this admission number already exists'
                })
            }
        }

        const updated = await Student.findOneAndUpdate(
            { _id: id, schoolId: req.user.schoolId },
            {
                ...(firstName !== undefined && { firstName }),
                ...(middleName !== undefined && { middleName }),
                ...(lastName !== undefined && { lastName }),
                ...(email !== undefined && { email }),
                ...(accessPin !== undefined && { accessPin }),
                ...(currentClassId !== undefined && { currentClassId: currentClassId || null }),
                ...(admissionNumber !== undefined && { admissionNumber }),
                ...(status !== undefined && { status }),
            },
            { new: true }
        )
        return res.status(200).json({ success: true, data: updated, message: 'Student updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getStudent = async (req, res) => {
    try {
        const { id } = req.params
        const student = await Student.findOne({ _id: id, schoolId: req.user.schoolId })
            .populate('currentClassId', 'name arm')
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' })
        }
        return res.status(200).json({ success: true, data: student, message: 'Student fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getStudentResults = async (req, res) => {
    try {
        const { id } = req.params
        const { cycleId } = req.query
        const filter = { schoolId: req.user.schoolId, studentId: id }
        if (cycleId) filter.cycleId = cycleId
        const scores = await Score.find(filter)
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .populate('teacherId', 'name')
            .populate('cycleId', 'session term isPublished')
            .sort({ createdAt: -1 })
        return res.status(200).json({ success: true, data: scores, message: 'Results fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getDashboardStats = async (req, res) => {
    try {
        const schoolId = req.user.schoolId
        const [studentCount, teacherCount, classCount, resultCount] = await Promise.all([
            Student.countDocuments({ schoolId }),
            User.countDocuments({ schoolId, role: 'teacher' }),
            Class.countDocuments({ schoolId }),
            Score.countDocuments({ schoolId }),
        ])
        return res.status(200).json({ success: true, data: { studentCount, teacherCount, classCount, resultCount }, message: 'Dashboard stats fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getMissingResults = async (req, res) => {
    try {
        const { cycleId } = req.query
        const classes = await Class.find({ schoolId: req.user.schoolId }).sort({ name: 1 })
        const teachers = await User.find({ schoolId: req.user.schoolId, role: 'teacher' }).select('assignedSubjects')
        const students = await Student.find({ schoolId: req.user.schoolId }).populate('currentClassId', 'name arm')
        
        const scoreFilter = { schoolId: req.user.schoolId }
        if (cycleId) scoreFilter.cycleId = cycleId
        const scores = await Score.find(scoreFilter).select('studentId classsId subjectId')
        
        const allSubjectIds = new Set()
        teachers.forEach((t) => {
            (t.assignedSubjects || []).forEach((a) => {
                if (a.subjectId) allSubjectIds.add(a.subjectId)
            })
        })
        const subjects = await Subject.find({ _id: { $in: Array.from(allSubjectIds) } }).select('name')
        const subjectMap = new Map()
        subjects.forEach((s) => subjectMap.set(String(s._id), s.name))

        const classSubjectMap = new Map()
        teachers.forEach((t) => {
            (t.assignedSubjects || []).forEach((a) => {
                if (a.classId && a.subjectId) {
                    if (!classSubjectMap.has(String(a.classId))) {
                        classSubjectMap.set(String(a.classId), new Set())
                    }
                    classSubjectMap.get(String(a.classId)).add(String(a.subjectId))
                }
            })
        })

        const scoreSet = new Set(scores.map((s) => `${s.studentId}-${s.classsId}-${s.subjectId}`))
        const missing = []

        for (const student of students) {
            if (!student.currentClassId?._id) continue
            const classId = String(student.currentClassId._id)
            const subjectIds = classSubjectMap.get(classId)
            if (!subjectIds || subjectIds.size === 0) continue
            for (const subjectId of subjectIds) {
                const key = `${student._id}-${classId}-${subjectId}`
                if (!scoreSet.has(key)) {
                    missing.push({
                        studentId: student._id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        classId,
                        className: student.currentClassId.name,
                        classArm: student.currentClassId.arm || "",
                        subjectId,
                        subjectName: subjectMap.get(subjectId) || "Unknown",
                    })
                }
            }
        }

        return res.status(200).json({ success: true, data: missing, message: 'Missing results fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params
        const student = await Student.findOneAndDelete({ _id: id, schoolId: req.user.schoolId })
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' })
        }
        await Score.deleteMany({ schoolId: req.user.schoolId, studentId: id })
        return res.status(200).json({ success: true, message: 'Student deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const promoteStudents = async (req, res) => {
    try {
        const { fromClassId, toClassId, studentIds, cycleId, mode } = req.body
        const schoolId = req.user.schoolId

        if (!fromClassId || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Source class and at least one student are required' })
        }

        const isGraduation = mode === 'graduate'
        const isLeft = mode === 'left'

        if (!isGraduation && !isLeft && !toClassId) {
            return res.status(400).json({ success: false, message: 'Destination class is required for promotion' })
        }

        if (!isGraduation && !isLeft && String(fromClassId) === String(toClassId)) {
            return res.status(400).json({ success: false, message: 'Source and destination classes cannot be the same' })
        }

        const fromClass = await Class.findOne({ _id: fromClassId, schoolId })
        if (!fromClass) {
            return res.status(404).json({ success: false, message: 'Source class not found' })
        }

        let cycle = null
        if (cycleId) {
            cycle = await AcademicCycle.findOne({ _id: cycleId, schoolId })
        }

        const students = await Student.find({ _id: { $in: studentIds }, schoolId, currentClassId: fromClassId })
        const foundIds = new Set(students.map((s) => String(s._id)))
        const invalidIds = studentIds.filter((id) => !foundIds.has(String(id)))

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'No valid students found in the selected source class' })
        }

        const updatePromises = students.map((student) => {
            const update = {
                $set: {},
                $push: {
                    promotionHistory: {
                        fromClassId: fromClassId,
                        toClassId: isGraduation || isLeft ? null : toClassId,
                        cycleId: cycleId || undefined,
                        date: new Date()
                    }
                }
            }

            if (isGraduation) {
                update.$set.status = 'graduated'
                update.$set.currentClassId = null
            } else if (isLeft) {
                update.$set.status = 'left'
                update.$set.currentClassId = null
            } else {
                update.$set.currentClassId = toClassId
            }

            return Student.findOneAndUpdate(
                { _id: student._id, schoolId },
                update,
                { new: true }
            )
        })

        const updatedStudents = await Promise.all(updatePromises)

        const message = isGraduation
            ? `${updatedStudents.length} student(s) graduated successfully${invalidIds.length > 0 ? `, ${invalidIds.length} skipped` : ''}`
            : isLeft
                ? `${updatedStudents.length} student(s) marked as left successfully${invalidIds.length > 0 ? `, ${invalidIds.length} skipped` : ''}`
                : `${updatedStudents.length} student(s) promoted successfully${invalidIds.length > 0 ? `, ${invalidIds.length} skipped` : ''}`

        return res.status(200).json({
            success: true,
            data: updatedStudents,
            promotedCount: updatedStudents.length,
            skippedCount: invalidIds.length,
            message
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getResults = async (req, res) => {
    try {
        const { classId, studentId, cycleId } = req.query
        const filter = { schoolId: req.user.schoolId }
        if (classId) filter.classsId = classId
        if (studentId) filter.studentId = studentId
        if (cycleId) filter.cycleId = cycleId
        const scores = await Score.find(filter)
            .populate('studentId', 'firstName lastName admissionNumber')
            .populate('subjectId', 'name code')
            .populate('classsId', 'name')
            .populate('cycleId', 'session term isPublished')
            .sort({ createdAt: -1 })
            .limit(500)
        return res.status(200).json({ success: true, data: scores, message: 'Results fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTeacherMe = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.user._id, schoolId: req.user.schoolId, role: 'teacher' })
            .select('-password')
            .populate('assignedSubjects.classId', 'name arm')
            .populate('assignedSubjects.subjectId', 'name code')
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }
        return res.status(200).json({ success: true, data: teacher, message: 'Teacher profile fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTeacherClasses = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.user._id, schoolId: req.user.schoolId, role: 'teacher' })
            .select('assignedSubjects')
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }

        const classIds = [...new Set((teacher.assignedSubjects || []).map((a) => a.classId).filter(Boolean))]
        const classes = await Class.find({ _id: { $in: classIds }, schoolId: req.user.schoolId })
            .sort({ name: 1 })
        const result = await Promise.all(classes.map(async (c) => {
            const studentCount = await Student.countDocuments({ schoolId: req.user.schoolId, currentClassId: c._id })
            const teacherSubjectIds = [...new Set((teacher.assignedSubjects || [])
                .filter((a) => String(a.classId) === String(c._id))
                .map((a) => a.subjectId)
                .filter(Boolean))]
            const subjects = await Subject.find({ _id: { $in: teacherSubjectIds } }).select('name code')
            return { ...c.toObject(), studentCount, subjects }
        }))
        return res.status(200).json({ success: true, data: result, message: 'Teacher classes fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTeacherResults = async (req, res) => {
    try {
        const { cycleId } = req.query
        if (!cycleId) {
            return res.status(400).json({ success: false, message: 'Academic cycle is required to view results' })
        }
        const filter = { schoolId: req.user.schoolId, teacherId: req.user._id, cycleId }
        const scores = await Score.find(filter)
            .populate('studentId', 'firstName lastName admissionNumber')
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .populate('cycleId', 'session term isPublished')
            .sort({ createdAt: -1 })
            .limit(500)
        return res.status(200).json({ success: true, data: scores, message: 'Teacher results fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTeacherClassStudents = async (req, res) => {
    try {
        const { classId } = req.params
        const teacher = await User.findOne({ _id: req.user._id, schoolId: req.user.schoolId, role: 'teacher' })
            .select('assignedSubjects')
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }

        const hasAccess = (teacher.assignedSubjects || []).some((a) => String(a.classId) === String(classId))
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this class' })
        }

        const students = await Student.find({ schoolId: req.user.schoolId, currentClassId: classId })
            .sort({ lastName: 1 })
            .populate('currentClassId', 'name arm')
        return res.status(200).json({ success: true, data: students, message: 'Students fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateResult = async (req, res) => {
    try {
        const { id } = req.params
        const { ca1, ca2, ca3, exam } = req.body

        const score = await Score.findOne({ _id: id, schoolId: req.user.schoolId, teacherId: req.user._id })
        if (!score) {
            return res.status(404).json({ success: false, message: 'Result not found or not authorized' })
        }

        if (score.isLocked) {
            return res.status(403).json({ success: false, message: 'This result is locked and cannot be edited' })
        }

        const cycle = await AcademicCycle.findOne({ _id: score.cycleId, schoolId: req.user.schoolId })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }

        if (cycle.isPublished) {
            return res.status(403).json({ success: false, message: 'This cycle is published and results cannot be edited' })
        }

        const numCa1 = ca1 !== undefined ? Number(ca1) : score.ca1
        const numCa2 = ca2 !== undefined ? Number(ca2) : score.ca2
        const numCa3 = ca3 !== undefined ? Number(ca3) : score.ca3
        const numExam = exam !== undefined ? Number(exam) : score.exam

        const school = await School.findById(req.user.schoolId).select('gradingScale caConfig')
        const caConfig = school?.caConfig || { caCount: 3, caMaxScores: [10, 10, 20], examMaxScore: 70 }
        const caCount = caConfig.caCount || 3
        const caMaxScores = caConfig.caMaxScores || [10, 10, 20]
        const examMaxScore = caConfig.examMaxScore || 70

        if (numCa1 < 0 || numCa1 > (caMaxScores[0] || 10)) {
            return res.status(400).json({ success: false, message: `CA1 must be between 0 and ${caMaxScores[0] || 10}` })
        }
        if (numCa2 < 0 || numCa2 > (caMaxScores[1] || 10)) {
            return res.status(400).json({ success: false, message: `CA2 must be between 0 and ${caMaxScores[1] || 10}` })
        }
        if (caCount === 3 && (numCa3 < 0 || numCa3 > (caMaxScores[2] || 20))) {
            return res.status(400).json({ success: false, message: `CA3 must be between 0 and ${caMaxScores[2] || 20}` })
        }
        if (numExam < 0 || numExam > examMaxScore) {
            return res.status(400).json({ success: false, message: `Exam must be between 0 and ${examMaxScore}` })
        }

        score.ca1 = numCa1
        score.ca2 = numCa2
        score.ca3 = numCa3
        score.exam = numExam
        score.total = numCa1 + numCa2 + numExam + numCa3

        if (school?.gradingScale && school.gradingScale.length > 0) {
            const match = school.gradingScale.find((g) => score.total >= g.minScore && score.total <= g.maxScore)
            if (match) {
                score.grade = match.grade
                score.remark = match.remark
            }
        }

        await score.save()
        return res.status(200).json({ success: true, data: score, message: 'Result updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addResult = async (req, res) => {
    try {
        const { studentId, classsId, subjectId, cycleId, ca1, ca2, ca3, exam, total, grade, remark } = req.body

        if (!cycleId) {
            return res.status(400).json({ success: false, message: 'Academic cycle is required' })
        }

        const cycle = await AcademicCycle.findOne({ _id: cycleId, schoolId: req.user.schoolId })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }

        if (cycle.isPublished) {
            return res.status(403).json({ success: false, message: 'This cycle is published and new results cannot be added' })
        }

        const teacher = await User.findOne({ _id: req.user._id, schoolId: req.user.schoolId, role: 'teacher' })
            .select('assignedSubjects')
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }

        const hasAccess = (teacher.assignedSubjects || []).some((a) => String(a.classId) === String(classsId) && String(a.subjectId) === String(subjectId))
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'You are not authorized to add results for this class and subject' })
        }

        const existing = await Score.findOne({ schoolId: req.user.schoolId, studentId, classsId, subjectId, cycleId })
        if (existing) {
            return res.status(409).json({ success: false, message: 'A result already exists for this student in this class, subject and term' })
        }

        const numCa1 = ca1 === undefined || ca1 === null || ca1 === "" ? 0 : Number(ca1)
        const numCa2 = ca2 === undefined || ca2 === null || ca2 === "" ? 0 : Number(ca2)
        const numCa3 = ca3 === undefined || ca3 === null || ca3 === "" ? 0 : Number(ca3)
        const numExam = exam === undefined || exam === null || exam === "" ? 0 : Number(exam)

        const school = await School.findById(req.user.schoolId).select('gradingScale caConfig')
        const caConfig = school?.caConfig || { caCount: 3, caMaxScores: [10, 10, 20], examMaxScore: 70 }
        const caCount = caConfig.caCount || 3
        const caMaxScores = caConfig.caMaxScores || [10, 10, 20]
        const examMaxScore = caConfig.examMaxScore || 70

        if (numCa1 < 0 || numCa1 > (caMaxScores[0] || 10)) {
            return res.status(400).json({ success: false, message: `CA1 must be between 0 and ${caMaxScores[0] || 10}` })
        }
        if (numCa2 < 0 || numCa2 > (caMaxScores[1] || 10)) {
            return res.status(400).json({ success: false, message: `CA2 must be between 0 and ${caMaxScores[1] || 10}` })
        }
        if (caCount === 3 && (numCa3 < 0 || numCa3 > (caMaxScores[2] || 20))) {
            return res.status(400).json({ success: false, message: `CA3 must be between 0 and ${caMaxScores[2] || 20}` })
        }
        if (numExam < 0 || numExam > examMaxScore) {
            return res.status(400).json({ success: false, message: `Exam must be between 0 and ${examMaxScore}` })
        }

        const calculatedTotal = numCa1 + numCa2 + numExam + numCa3
        let calculatedGrade = grade || null
        let calculatedRemark = remark || null
        if (school?.gradingScale && school.gradingScale.length > 0) {
            const match = school.gradingScale.find((g) => calculatedTotal >= g.minScore && calculatedTotal <= g.maxScore)
            if (match) {
                calculatedGrade = match.grade
                calculatedRemark = match.remark
            }
        }

        const score = new Score({
            schoolId: req.user.schoolId,
            studentId,
            classsId,
            subjectId,
            cycleId,
            teacherId: req.user._id,
            ca1: numCa1,
            ca2: numCa2,
            ca3: numCa3,
            exam: numExam,
            total: calculatedTotal,
            grade: calculatedGrade,
            remark: calculatedRemark,
        })
        await score.save()
        return res.status(201).json({ success: true, data: score, message: 'Result added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteResult = async (req, res) => {
    try {
        const { id } = req.params
        const score = await Score.findOne({ _id: id, schoolId: req.user.schoolId, teacherId: req.user._id })
        if (!score) {
            return res.status(404).json({ success: false, message: 'Result not found or not authorized' })
        }

        if (score.isLocked) {
            return res.status(403).json({ success: false, message: 'This result is locked and cannot be deleted' })
        }

        const cycle = await AcademicCycle.findOne({ _id: score.cycleId, schoolId: req.user.schoolId })
        if (cycle?.isPublished) {
            return res.status(403).json({ success: false, message: 'This cycle is published and results cannot be deleted' })
        }

        await Score.findByIdAndDelete(id)
        return res.status(200).json({ success: true, message: 'Result deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getSchoolSettings = async (req, res) => {
    try {
        const school = await School.findById(req.user.schoolId)
        if (!school) {
            return res.status(404).json({ success: false, message: 'School not found' })
        }
        return res.status(200).json({ success: true, data: school, message: 'School fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateSchoolSettings = async (req, res) => {
    try {
        const { name, address, logoUrl, supportEmail, motto, caConfig } = req.body
        const updatePayload = {}
        if (name !== undefined) updatePayload.name = name
        if (address !== undefined) updatePayload.address = address
        if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl
        if (supportEmail !== undefined) updatePayload.supportEmail = supportEmail
        if (motto !== undefined) updatePayload.motto = motto
        if (caConfig !== undefined) {
            if (caConfig.caCount !== undefined) updatePayload['caConfig.caCount'] = caConfig.caCount
            if (caConfig.caMaxScores !== undefined) updatePayload['caConfig.caMaxScores'] = caConfig.caMaxScores
            if (caConfig.examMaxScore !== undefined) updatePayload['caConfig.examMaxScore'] = caConfig.examMaxScore
        }
        const school = await School.findByIdAndUpdate(req.user.schoolId, updatePayload, { new: true })
        return res.status(200).json({ success: true, data: school, message: 'School updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getClassPerformance = async (req, res) => {
    try {
        const { classId } = req.params
        const { cycleId } = req.query
        const schoolId = req.user.schoolId

        const klass = await Class.findOne({ _id: classId, schoolId })
        if (!klass) {
            return res.status(404).json({ success: false, message: 'Class not found' })
        }

        const students = await Student.find({ schoolId, currentClassId: classId })
            .sort({ lastName: 1 })
            .populate('currentClassId', 'name arm')

        const scoreFilter = { schoolId, classsId: classId }
        if (cycleId) scoreFilter.cycleId = cycleId

        const scores = await Score.find(scoreFilter)
            .populate('subjectId', 'name code')
            .populate('cycleId', 'session term')

        const studentScoreMap = new Map()
        scores.forEach((score) => {
            const sid = String(score.studentId)
            if (!studentScoreMap.has(sid)) {
                studentScoreMap.set(sid, [])
            }
            studentScoreMap.get(sid).push(score)
        })

        const school = await School.findById(schoolId).select('gradingScale')

        const studentsWithPerformance = students.map((student) => {
            const sid = String(student._id)
            const studentScores = studentScoreMap.get(sid) || []

            let overallAverage = null
            let overallGrade = null
            let overallRemark = null

            if (studentScores.length > 0) {
                const totalSum = studentScores.reduce((sum, s) => sum + (s.total || 0), 0)
                overallAverage = Math.round(totalSum / studentScores.length)

                if (school?.gradingScale && school.gradingScale.length > 0) {
                    const match = school.gradingScale.find(
                        (g) => overallAverage >= g.minScore && overallAverage <= g.maxScore
                    )
                    if (match) {
                        overallGrade = match.grade
                        overallRemark = match.remark
                    }
                }
            }

            return {
                ...student.toObject(),
                overallAverage,
                overallGrade,
                overallRemark,
                subjectsRecorded: studentScores.length,
            }
        })

        return res.status(200).json({
            success: true,
            data: studentsWithPerformance,
            message: 'Class performance fetched successfully',
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

module.exports = {
    getSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    getTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    getStudents,
    getStudent,
    addStudent,
    updateStudent,
    getStudentResults,
    deleteStudent,
    getResults,
    getSchoolSettings,
    updateSchoolSettings,
    getTeacherMe,
    getTeacherClasses,
    getTeacherResults,
    getTeacherClassStudents,
    updateResult,
    addResult,
    deleteResult,
    getMissingResults,
    getDashboardStats,
    promoteStudents,
    getClassPerformance,
}
