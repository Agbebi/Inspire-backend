const { Student, Score, AcademicCycle, Parent, Notification, Message } = require('../../models')
const { emitToParent, emitToSchool } = require('../../socket')

function assertLinked(parent, studentId) {
    return parent.students.some((s) => s.toString() === String(studentId))
}

function studentSummary(student) {
    return {
        _id: student._id,
        firstName: student.firstName,
        middleName: student.middleName || '',
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        status: student.status || 'active',
        className: student.currentClassId?.name || '',
        classArm: student.currentClassId?.arm || ''
    }
}

async function classRanking(schoolId, classId, cycleId) {
    const scores = await Score.find({ schoolId, classsId: classId, cycleId })
    const byStudent = {}
    scores.forEach((s) => {
        if (s.total == null) return
        if (!byStudent[s.studentId]) byStudent[s.studentId] = { sum: 0, count: 0 }
        byStudent[s.studentId].sum += s.total
        byStudent[s.studentId].count += 1
    })
    const averages = Object.entries(byStudent).map(([sid, v]) => ({
        studentId: sid,
        avg: v.count ? v.sum / v.count : 0
    }))
    averages.sort((a, b) => b.avg - a.avg)
    return averages
}

async function resolveCycle(schoolId, cycleId) {
    if (cycleId) {
        return AcademicCycle.findOne({ _id: cycleId, schoolId })
    }
    return AcademicCycle.findOne({ schoolId, isCurrent: true })
}

const listStudents = async (req, res) => {
    try {
        const students = await Student.find({ _id: { $in: req.parent.students } })
            .populate('currentClassId', 'name arm')
        return res.status(200).json({
            success: true,
            data: students.map(studentSummary),
            message: 'Linked students fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const linkStudent = async (req, res) => {
    try {
        const { admissionNumber, accessPin } = req.body
        if (!admissionNumber || accessPin === undefined) {
            return res.status(400).json({ success: false, message: 'Admission number and access PIN are required' })
        }

        const student = await Student.findOne({
            schoolId: req.parent.schoolId,
            admissionNumber: String(admissionNumber).trim()
        }).populate('currentClassId', 'name arm')

        if (!student) {
            return res.status(404).json({ success: false, message: 'No student found with that admission number in this school' })
        }
        if (String(student.accessPin) !== String(accessPin).trim()) {
            return res.status(401).json({ success: false, message: 'Incorrect access PIN' })
        }

        if (!assertLinked(req.parent, student._id)) {
            req.parent.students.push(student._id)
            await req.parent.save()
        }

        return res.status(200).json({
            success: true,
            data: studentSummary(student),
            message: 'Student linked successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const unlinkStudent = async (req, res) => {
    try {
        const { id } = req.params
        req.parent.students = req.parent.students.filter((s) => s.toString() !== String(id))
        await req.parent.save()
        return res.status(200).json({ success: true, message: 'Student unlinked' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getCycles = async (req, res) => {
    try {
        const cycles = await AcademicCycle.find({ schoolId: req.parent.schoolId })
            .sort({ isCurrent: -1, session: -1, term: 1 })
        return res.status(200).json({ success: true, data: cycles, message: 'Cycles fetched' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getResults = async (req, res) => {
    try {
        const { id } = req.params
        if (!assertLinked(req.parent, id)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const cycle = await resolveCycle(req.parent.schoolId, req.query.cycleId)
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'No cycle found' })
        }
        const scores = await Score.find({ schoolId: req.parent.schoolId, studentId: id, cycleId: cycle._id })
            .populate('subjectId', 'name code')
            .populate('teacherId', 'name')
        return res.status(200).json({
            success: true,
            data: {
                cycle: { _id: cycle._id, session: cycle.session, term: cycle.term },
                scores: scores.map((s) => ({
                    _id: s._id,
                    subject: s.subjectId?.name || '—',
                    code: s.subjectId?.code || '',
                    ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, exam: s.exam,
                    total: s.total, grade: s.grade, remark: s.remark,
                    teacher: s.teacherId?.name || ''
                }))
            },
            message: 'Results fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getReport = async (req, res) => {
    try {
        const { id } = req.params
        if (!assertLinked(req.parent, id)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const cycle = await resolveCycle(req.parent.schoolId, req.query.cycleId)
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'No cycle found' })
        }
        const student = await Student.findById(id).populate('currentClassId', 'name arm')
        const scores = await Score.find({ schoolId: req.parent.schoolId, studentId: id, cycleId: cycle._id })
            .populate('subjectId', 'name code')
            .populate('teacherId', 'name')

        const totals = scores.filter((s) => s.total != null).map((s) => s.total)
        const average = totals.length ? +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null

        const ranking = await classRanking(req.parent.schoolId, student.currentClassId?._id, cycle._id)
        const position = ranking.findIndex((r) => r.studentId.toString() === String(id)) + 1

        return res.status(200).json({
            success: true,
            data: {
                cycle: { _id: cycle._id, session: cycle.session, term: cycle.term },
                student: { name: `${student.firstName} ${student.lastName}`, className: student.currentClassId?.name || '', classArm: student.currentClassId?.arm || '' },
                summary: {
                    average,
                    position: position || null,
                    classSize: ranking.length || null
                },
                scores: scores.map((s) => ({
                    _id: s._id,
                    subject: s.subjectId?.name || '—',
                    ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, exam: s.exam,
                    total: s.total, grade: s.grade, remark: s.remark,
                    teacher: s.teacherId?.name || ''
                }))
            },
            message: 'Report card fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getPerformance = async (req, res) => {
    try {
        const { id } = req.params
        if (!assertLinked(req.parent, id)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const cycle = await resolveCycle(req.parent.schoolId, req.query.cycleId)
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'No cycle found' })
        }
        const student = await Student.findById(id).populate('currentClassId', 'name arm')
        const classId = student.currentClassId?._id

        const scores = await Score.find({ schoolId: req.parent.schoolId, cycleId: cycle._id, classsId: classId })
            .populate('subjectId', 'name')

        const ranking = await classRanking(req.parent.schoolId, classId, cycle._id)
        const classAverages = ranking.map((r) => r.avg)
        const classAverage = classAverages.length ? +(classAverages.reduce((a, b) => a + b, 0) / classAverages.length).toFixed(1) : null
        const position = ranking.findIndex((r) => r.studentId.toString() === String(id)) + 1
        const studentRec = ranking.find((r) => r.studentId.toString() === String(id))
        const studentAverage = studentRec ? +studentRec.avg.toFixed(1) : null

        const subjectMap = {}
        scores.forEach((s) => {
            if (s.total == null || !s.subjectId) return
            const key = s.subjectId._id.toString()
            if (!subjectMap[key]) subjectMap[key] = { name: s.subjectId.name, sum: 0, count: 0 }
            subjectMap[key].sum += s.total
            subjectMap[key].count += 1
        })
        const subjectAverages = Object.values(subjectMap)
            .map((s) => ({ subject: s.name, average: +(s.sum / s.count).toFixed(1) }))
            .sort((a, b) => b.average - a.average)

        const atRiskInClass = ranking.filter((r) => r.avg < 50).length

        return res.status(200).json({
            success: true,
            data: {
                student: { name: `${student.firstName} ${student.lastName}`, average: studentAverage, position: position || null, classSize: ranking.length || null },
                class: { average: classAverage, atRiskCount: atRiskInClass },
                subjectAverages
            },
            message: 'Class performance fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getTrend = async (req, res) => {
    try {
        const { id } = req.params
        if (!assertLinked(req.parent, id)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const cycles = await AcademicCycle.find({ schoolId: req.parent.schoolId, isPublished: true })
            .sort({ session: 1, term: 1 })
        const trend = []
        for (const cycle of cycles) {
            const scores = await Score.find({ schoolId: req.parent.schoolId, studentId: id, cycleId: cycle._id })
            const totals = scores.filter((s) => s.total != null).map((s) => s.total)
            const average = totals.length ? +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null
            trend.push({ cycleId: cycle._id, session: cycle.session, term: cycle.term, average })
        }
        return res.status(200).json({ success: true, data: trend, message: 'Trend fetched' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getAtRisk = async (req, res) => {
    try {
        const { id } = req.params
        if (!assertLinked(req.parent, id)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const cycle = await resolveCycle(req.parent.schoolId, req.query.cycleId)
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'No cycle found' })
        }
        const student = await Student.findById(id).populate('currentClassId', 'name arm')
        const scores = await Score.find({ schoolId: req.parent.schoolId, studentId: id, cycleId: cycle._id })
            .populate('subjectId', 'name')

        const totals = scores.filter((s) => s.total != null).map((s) => s.total)
        const average = totals.length ? +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null
        const reasons = []
        if (average != null && average < 50) reasons.push(`Overall average is low (${average}%)`)
        scores.forEach((s) => {
            if (s.grade === 'F') reasons.push(`Failing grade (F) in ${s.subjectId?.name || 'a subject'}`)
            else if (s.grade === 'D') reasons.push(`Borderline grade (D) in ${s.subjectId?.name || 'a subject'}`)
        })

        const trend = await getTrendArray(req.parent.schoolId, id)
        if (trend.length >= 2) {
            const last = trend[trend.length - 1].average
            const prev = trend[trend.length - 2].average
            if (last != null && prev != null && last < prev - 10) {
                reasons.push(`Performance dropped by ${(prev - last).toFixed(1)}% compared to the previous term`)
            }
        }

        return res.status(200).json({
            success: true,
            data: { average, isAtRisk: reasons.length > 0, reasons },
            message: 'At-risk analysis fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

async function getTrendArray(schoolId, studentId) {
    const cycles = await AcademicCycle.find({ schoolId, isPublished: true }).sort({ session: 1, term: 1 })
    const trend = []
    for (const cycle of cycles) {
        const scores = await Score.find({ schoolId, studentId, cycleId: cycle._id })
        const totals = scores.filter((s) => s.total != null).map((s) => s.total)
        const average = totals.length ? +(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null
        trend.push({ cycleId: cycle._id, session: cycle.session, term: cycle.term, average })
    }
    return trend
}

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.parent._id })
            .sort({ createdAt: -1 })
            .populate('studentId', 'firstName lastName')
        const unreadCount = notifications.filter((n) => !n.read).length
        return res.status(200).json({
            success: true,
            data: { notifications, unreadCount },
            message: 'Notifications fetched'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params
        const notif = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.parent._id },
            { read: true },
            { new: true }
        )
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' })
        }
        return res.status(200).json({ success: true, data: notif, message: 'Marked as read' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.parent._id, read: false },
            { read: true }
        )
        return res.status(200).json({ success: true, message: 'All notifications marked as read' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params
        await Notification.findOneAndDelete({ _id: id, recipient: req.parent._id })
        return res.status(200).json({ success: true, message: 'Notification deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const markMessageRead = async (req, res) => {
    try {
        const { id } = req.params
        const message = await Message.findOneAndUpdate(
            { _id: id, $or: [
                { senderType: 'parent', senderId: req.parent._id },
                { receiverType: 'parent', receiverId: req.parent._id }
            ]},
            { read: true },
            { new: true }
        )
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' })
        }
        return res.status(200).json({ success: true, data: message, message: 'Message marked as read' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const markAllMessagesRead = async (req, res) => {
    try {
        await Message.updateMany(
            { schoolId: req.parent.schoolId, $or: [
                { senderType: 'parent', senderId: req.parent._id },
                { receiverType: 'parent', receiverId: req.parent._id }
            ], read: false },
            { read: true }
        )
        return res.status(200).json({ success: true, message: 'All messages marked as read' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params
        await Message.findOneAndDelete({
            _id: id,
            $or: [
                { senderType: 'parent', senderId: req.parent._id },
                { receiverType: 'parent', receiverId: req.parent._id }
            ]
        })
        return res.status(200).json({ success: true, message: 'Message deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            schoolId: req.parent.schoolId,
            $or: [
                { senderType: 'parent', senderId: req.parent._id },
                { receiverType: 'parent', receiverId: req.parent._id }
            ]
        }).sort({ createdAt: 1 }).populate('studentId', 'firstName lastName')
        return res.status(200).json({ success: true, data: messages, message: 'Messages fetched' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const sendMessage = async (req, res) => {
    try {
        const { body, studentId } = req.body
        if (!body || !body.trim()) {
            return res.status(400).json({ success: false, message: 'Message body is required' })
        }
        if (studentId && !assertLinked(req.parent, studentId)) {
            return res.status(403).json({ success: false, message: 'This student is not linked to your account' })
        }
        const message = await Message.create({
            schoolId: req.parent.schoolId,
            studentId: studentId || null,
            senderType: 'parent',
            senderId: req.parent._id,
            receiverType: 'school',
            receiverId: req.parent.schoolId,
            body: body.trim(),
            read: false
        })
        const io = req.app.get('io')
        if (io) {
            emitToSchool(io, req.parent.schoolId, 'message:new', message)
            emitToParent(io, req.parent._id, 'message:new', message)
        }
        return res.status(201).json({ success: true, data: message, message: 'Message sent' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

async function notifyResultPublished(io, schoolId, cycle) {
    try {
        const studentIds = await Score.find({ schoolId, cycleId: cycle._id }).distinct('studentId')
        if (!studentIds.length) return
        const parents = await Parent.find({ schoolId, students: { $in: studentIds } }).populate('students')
        for (const parent of parents) {
            const linked = parent.students.filter((s) => studentIds.some((sid) => sid.toString() === s.toString()))
            for (const sid of linked) {
                const existing = await Notification.findOne({
                    recipient: parent._id,
                    studentId: sid,
                    type: 'result_published',
                    cycleId: cycle._id
                })
                if (existing) continue
                const student = await Student.findById(sid).select('firstName lastName')
                const notif = await Notification.create({
                    schoolId,
                    recipient: parent._id,
                    studentId: sid,
                    cycleId: cycle._id,
                    type: 'result_published',
                    title: 'Results published',
                    message: `${student?.firstName || 'A student'}'s results for ${cycle.session} ${cycle.term} are now available.`
                })
                if (io) emitToParent(io, parent._id, 'notification:new', notif)
            }
        }
    } catch (error) {
        console.log('notifyResultPublished error', error)
    }
}

module.exports = {
    listStudents,
    linkStudent,
    unlinkStudent,
    getCycles,
    getResults,
    getReport,
    getPerformance,
    getTrend,
    getAtRisk,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getMessages,
    markMessageRead,
    markAllMessagesRead,
    deleteMessage,
    sendMessage,
    notifyResultPublished
}
