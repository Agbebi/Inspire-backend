const { AcademicCycle, Class, Student, Subject, Score } = require('../../models')

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
}

function computePosition(totalsByStudent, studentId) {
    const sorted = Array.from(totalsByStudent.entries())
        .map(([id, total]) => ({ id, total }))
        .sort((a, b) => b.total - a.total)

    let rank = 0
    let prevTotal = null
    let skipCount = 0
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].total !== prevTotal) {
            rank = i + 1 - skipCount
            prevTotal = sorted[i].total
        }
        if (sorted[i].id === studentId) {
            return `${rank}${getOrdinalSuffix(rank)}`
        }
    }
    return '—'
}

const getCyclesSummary = async (req, res) => {
    try {
        const cycles = await AcademicCycle.find({ schoolId: req.user.schoolId }).sort({ session: -1, term: 1 })
        return res.status(200).json({ success: true, data: cycles, message: 'Cycles summary fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getClassBroadsheet = async (req, res) => {
    try {
        const { classId, cycleId } = req.query
        if (!classId || !cycleId) {
            return res.status(400).json({ success: false, message: 'classId and cycleId are required' })
        }

        const klass = await Class.findOne({ _id: classId, schoolId: req.user.schoolId }).populate('subjects', 'name code')
        if (!klass) {
            return res.status(404).json({ success: false, message: 'Class not found' })
        }

        const students = await Student.find({ schoolId: req.user.schoolId, currentClassId: classId, status: { $ne: 'left' } })
            .sort({ lastName: 1 })

        const scores = await Score.find({
            schoolId: req.user.schoolId,
            classsId: classId,
            cycleId,
        }).populate('subjectId', 'name code')

        const scoresByStudent = new Map()
        scores.forEach((s) => {
            if (!scoresByStudent.has(String(s.studentId))) {
                scoresByStudent.set(String(s.studentId), [])
            }
            scoresByStudent.get(String(s.studentId)).push(s)
        })

        const totalsByStudent = new Map()
        students.forEach((st) => {
            const list = scoresByStudent.get(String(st._id)) || []
            const total = list.reduce((sum, s) => sum + (s.total || 0), 0)
            totalsByStudent.set(String(st._id), total)
        })

        const rows = students.map((st) => {
            const list = scoresByStudent.get(String(st._id)) || []
            const subjectMap = new Map()
            list.forEach((s) => {
                subjectMap.set(String(s.subjectId), s)
            })
            const total = totalsByStudent.get(String(st._id)) || 0
            const average = list.length > 0 ? Number((total / list.length).toFixed(2)) : 0
            return {
                studentId: st._id,
                firstName: st.firstName,
                lastName: st.lastName,
                admissionNumber: st.admissionNumber,
                total,
                average,
                position: computePosition(totalsByStudent, String(st._id)),
                subjects: klass.subjects.map((sub) => {
                    const sc = subjectMap.get(String(sub._id))
                    return {
                        subjectId: sub._id,
                        name: sub.name,
                        code: sub.code,
                        ca1: sc?.ca1 ?? null,
                        ca2: sc?.ca2 ?? null,
                        exam: sc?.exam ?? null,
                        total: sc?.total ?? null,
                        grade: sc?.grade ?? null,
                    }
                }),
            }
        })

        rows.sort((a, b) => b.total - a.total)

        return res.status(200).json({
            success: true,
            data: { className: klass.name, classArm: klass.arm, rows },
            message: 'Broadsheet fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getCumulativeAverages = async (req, res) => {
    try {
        const { classId, studentId } = req.query
        const filter = { schoolId: req.user.schoolId }
        if (classId) filter.classsId = classId
        if (studentId) filter.studentId = studentId

        const cycles = await AcademicCycle.find({ schoolId: req.user.schoolId }).sort({ session: 1, term: 1 })

        const scores = await Score.find(filter).populate('cycleId', 'session term')

        const byCycle = new Map()
        cycles.forEach((c) => byCycle.set(String(c._id), { cycle: c, total: 0, count: 0 }))
        scores.forEach((s) => {
            if (s.cycleId && byCycle.has(String(s.cycleId._id))) {
                const entry = byCycle.get(String(s.cycleId._id))
                entry.total += (s.total || 0)
                entry.count += 1
            }
        })

        const perCycle = cycles.map((c) => {
            const entry = byCycle.get(String(c._id))
            return {
                cycleId: c._id,
                session: c.session,
                term: c.term,
                total: entry?.total || 0,
                subjects: entry?.count || 0,
                average: entry && entry.count > 0 ? Number((entry.total / entry.count).toFixed(2)) : 0,
            }
        })

        const grandTotal = perCycle.reduce((sum, p) => sum + p.total, 0)
        const grandCount = perCycle.reduce((sum, p) => sum + p.subjects, 0)
        const cgpa = grandCount > 0 ? Number((grandTotal / grandCount).toFixed(2)) : 0

        return res.status(200).json({
            success: true,
            data: { perCycle, cgpa, grandTotal, grandCount },
            message: 'Cumulative averages fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getPerformanceAnalytics = async (req, res) => {
    try {
        const { cycleId } = req.query
        const cycleFilter = { schoolId: req.user.schoolId }
        if (cycleId) cycleFilter.cycleId = cycleId

        const scores = await Score.find(cycleFilter)
            .populate('subjectId', 'name')
            .populate('classsId', 'name arm')

        const totalScores = scores.reduce((sum, s) => sum + (s.total || 0), 0)
        const average = scores.length > 0 ? Number((totalScores / scores.length).toFixed(2)) : 0

        const gradeDist = {}
        scores.forEach((s) => {
            if (s.grade) {
                gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1
            }
        })

        const bySubject = new Map()
        scores.forEach((s) => {
            const key = s.subjectId?.name || 'Unknown'
            if (!bySubject.has(key)) {
                bySubject.set(key, { name: key, total: 0, count: 0 })
            }
            const entry = bySubject.get(key)
            entry.total += (s.total || 0)
            entry.count += 1
        })
        const subjectAverages = Array.from(bySubject.values())
            .map((e) => ({ name: e.name, average: e.count > 0 ? Number((e.total / e.count).toFixed(2)) : 0 }))
            .sort((a, b) => b.average - a.average)

        const byClass = new Map()
        scores.forEach((s) => {
            const key = s.classsId?.name || 'Unknown'
            if (!byClass.has(key)) {
                byClass.set(key, { name: key, total: 0, count: 0 })
            }
            const entry = byClass.get(key)
            entry.total += (s.total || 0)
            entry.count += 1
        })
        const classAverages = Array.from(byClass.values())
            .map((e) => ({ name: e.name, average: e.count > 0 ? Number((e.total / e.count).toFixed(2)) : 0 }))
            .sort((a, b) => b.average - a.average)

        return res.status(200).json({
            success: true,
            data: { average, gradeDist, subjectAverages, classAverages, resultCount: scores.length },
            message: 'Performance analytics fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

module.exports = {
    getCyclesSummary,
    getClassBroadsheet,
    getCumulativeAverages,
    getPerformanceAnalytics,
}
