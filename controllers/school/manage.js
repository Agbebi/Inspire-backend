const bcrypt = require('bcryptjs')
const { School, User, Class, Student, Subject, Score } = require('../../models')

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
        const scores = await Score.find({ schoolId: req.user.schoolId, studentId: id })
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .populate('teacherId', 'name')
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
        const classes = await Class.find({ schoolId: req.user.schoolId }).sort({ name: 1 })
        const teachers = await User.find({ schoolId: req.user.schoolId, role: 'teacher' }).select('assignedSubjects')
        const students = await Student.find({ schoolId: req.user.schoolId }).populate('currentClassId', 'name arm')
        const scores = await Score.find({ schoolId: req.user.schoolId }).select('studentId classsId subjectId')
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

const getResults = async (req, res) => {
    try {
        const { classId, studentId } = req.query
        const filter = { schoolId: req.user.schoolId }
        if (classId) filter.classsId = classId
        if (studentId) filter.studentId = studentId
        const scores = await Score.find(filter)
            .populate('studentId', 'firstName lastName admissionNumber')
            .populate('subjectId', 'name code')
            .populate('classsId', 'name')
            .sort({ createdAt: -1 })
            .limit(200)
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
        const scores = await Score.find({ schoolId: req.user.schoolId, teacherId: req.user._id })
            .populate('studentId', 'firstName lastName admissionNumber')
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .sort({ createdAt: -1 })
            .limit(200)
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
        const { ca1, ca2, exam } = req.body

        const score = await Score.findOne({ _id: id, schoolId: req.user.schoolId, teacherId: req.user._id })
        if (!score) {
            return res.status(404).json({ success: false, message: 'Result not found or not authorized' })
        }

        const numCa1 = ca1 !== undefined ? Number(ca1) : score.ca1
        const numCa2 = ca2 !== undefined ? Number(ca2) : score.ca2
        const numExam = exam !== undefined ? Number(exam) : score.exam

        score.ca1 = numCa1
        score.ca2 = numCa2
        score.exam = numExam
        score.total = numCa1 + numCa2 + numExam

        const school = await School.findById(req.user.schoolId).select('gradingScale')
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
        const { studentId, classsId, subjectId, ca1, ca2, exam, total, grade, remark } = req.body

        const teacher = await User.findOne({ _id: req.user._id, schoolId: req.user.schoolId, role: 'teacher' })
            .select('assignedSubjects')
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' })
        }

        const hasAccess = (teacher.assignedSubjects || []).some((a) => String(a.classId) === String(classsId) && String(a.subjectId) === String(subjectId))
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'You are not authorized to add results for this class and subject' })
        }

        const existing = await Score.findOne({ schoolId: req.user.schoolId, studentId, classsId, subjectId })
        if (existing) {
            return res.status(409).json({ success: false, message: 'A result already exists for this student in this class and subject' })
        }

        const numCa1 = ca1 === undefined || ca1 === null || ca1 === "" ? 0 : Number(ca1)
        const numCa2 = ca2 === undefined || ca2 === null || ca2 === "" ? 0 : Number(ca2)
        const numExam = exam === undefined || exam === null || exam === "" ? 0 : Number(exam)
        const calculatedTotal = numCa1 + numCa2 + numExam

        const school = await School.findById(req.user.schoolId).select('gradingScale')
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
            teacherId: req.user._id,
            ca1: numCa1,
            ca2: numCa2,
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
        const { name, address, logoUrl, supportEmail, motto } = req.body
        const school = await School.findByIdAndUpdate(
            req.user.schoolId,
            {
                ...(name !== undefined && { name }),
                ...(address !== undefined && { address }),
                ...(logoUrl !== undefined && { logoUrl }),
                ...(supportEmail !== undefined && { supportEmail }),
                ...(motto !== undefined && { motto }),
            },
            { new: true }
        )
        return res.status(200).json({ success: true, data: school, message: 'School updated successfully' })
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
}
