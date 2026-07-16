const express = require('express')
const router = express.Router()
const { Student, Score, School, AcademicCycle } = require('../models')

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
}

router.get('/school/search', async (req, res) => {
    try {
        const { q } = req.query
        if (!q || !q.trim()) {
            return res.status(200).json({ success: true, data: [], message: 'Schools fetched successfully' })
        }
        const regex = new RegExp(q.trim(), 'i')
        const schools = await School.find({
            $or: [
                { name: regex },
                { subDomain: regex }
            ]
        }).sort({ createdAt: -1 }).limit(10)
        return res.status(200).json({ success: true, data: schools, message: 'Schools fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
})

router.get('/results/public/cycles', async (req, res) => {
    try {
        const { admissionNumber, accessPin } = req.query

        if (!admissionNumber || !accessPin) {
            return res.status(400).json({
                success: false,
                message: 'Admission number and access PIN are required'
            })
        }

        const student = await Student.findOne({
            admissionNumber: admissionNumber.trim(),
            accessPin: Number(accessPin)
        })

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Invalid admission number or access PIN'
            })
        }

        const availableCycles = await AcademicCycle.find({ schoolId: student.schoolId, isPublished: true, resultsLocked: { $ne: true } })
            .sort({ session: -1, term: 1 })
            .select('_id session term')

        const hasResults = await Score.findOne({ studentId: student._id })

        const cyclesWithStatus = availableCycles.map(c => ({
            _id: c._id,
            session: c.session,
            term: c.term,
            hasResults: true,
        }))

        return res.status(200).json({
            success: true,
            data: {
                student: {
                    firstName: student.firstName,
                    lastName: student.lastName,
                    admissionNumber: student.admissionNumber,
                },
                cycles: cyclesWithStatus,
            },
            message: 'Available cycles fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
})

router.get('/results/public', async (req, res) => {
    try {
        const { admissionNumber, accessPin, cycleId } = req.query

        if (!admissionNumber || !accessPin) {
            return res.status(400).json({
                success: false,
                message: 'Admission number and access PIN are required'
            })
        }

        const student = await Student.findOne({
            admissionNumber: admissionNumber.trim(),
            accessPin: Number(accessPin)
        }).populate('currentClassId', 'name arm')

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Invalid admission number or access PIN'
            })
        }

        const school = await School.findById(student.schoolId)
        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        const availableCycles = await AcademicCycle.find({ schoolId: student.schoolId, isPublished: true, resultsLocked: { $ne: true } })
            .sort({ session: -1, term: 1 })
            .select('_id session term')

        let activeCycle = null
        let targetCycleId = cycleId

        if (targetCycleId) {
            activeCycle = await AcademicCycle.findOne({ _id: targetCycleId, schoolId: student.schoolId, isPublished: true, resultsLocked: { $ne: true } })
            if (!activeCycle) {
                return res.status(404).json({ success: false, message: 'Academic cycle not found or not published' })
            }
        } else {
            activeCycle = availableCycles.find(c => c._id.toString() === (availableCycles[0]?._id?.toString() || '')) || availableCycles[0] || null
            if (activeCycle) {
                targetCycleId = activeCycle._id
            }
        }

        if (!activeCycle) {
            return res.status(403).json({
                success: false,
                message: 'No results have been published yet'
            })
        }

        const filter = { studentId: student._id, cycleId: targetCycleId }

        const scores = await Score.find(filter)
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .populate('cycleId', 'session term')
            .sort({ createdAt: -1 })

        const totalScore = scores.reduce((sum, s) => sum + (s.total || 0), 0)
        const averageScore = scores.length > 0 ? totalScore / scores.length : 0

        let positionText = "—"
        let totalInClass = 0

        if (student.currentClassId && targetCycleId) {
            const classStudents = await Student.find({ currentClassId: student.currentClassId }).select('_id')
            const classStudentIds = classStudents.map((s) => s._id)
            totalInClass = classStudentIds.length

            if (totalInClass > 0) {
                const cycleScores = await Score.find({
                    studentId: { $in: classStudentIds },
                    cycleId: targetCycleId
                }).select('studentId total')

                const totalsByStudent = new Map()
                cycleScores.forEach((s) => {
                    const existing = totalsByStudent.get(s.studentId.toString()) || 0
                    totalsByStudent.set(s.studentId.toString(), existing + (s.total || 0))
                })

                const sorted = Array.from(totalsByStudent.entries())
                    .map(([id, total]) => ({ id, total }))
                    .sort((a, b) => b.total - a.total)

                const studentIdStr = student._id.toString()
                let rank = 0
                let prevTotal = null
                let skipCount = 0

                for (let i = 0; i < sorted.length; i++) {
                    if (sorted[i].total !== prevTotal) {
                        rank = i + 1 - skipCount
                        prevTotal = sorted[i].total
                    }
                    if (sorted[i].id === studentIdStr) {
                        positionText = `${rank}${getOrdinalSuffix(rank)} out of ${totalInClass}`
                        break
                    }
                }
            }
        }

        const subjectAverages = new Map()
        if (student.currentClassId && targetCycleId) {
            const classStudents = await Student.find({ currentClassId: student.currentClassId }).select('_id')
            const classStudentIds = classStudents.map((s) => s._id)

            const classScores = await Score.find({
                studentId: { $in: classStudentIds },
                cycleId: targetCycleId
            }).populate('subjectId', 'name code').select('subjectId total')

            const subjectTotals = new Map()
            const subjectCounts = new Map()
            classScores.forEach((s) => {
                if (!s.subjectId?._id) return
                const sid = s.subjectId._id.toString()
                const existingTotal = subjectTotals.get(sid) || 0
                subjectTotals.set(sid, existingTotal + (s.total || 0))
                const existingCount = subjectCounts.get(sid) || 0
                subjectCounts.set(sid, existingCount + 1)
            })

            subjectTotals.forEach((total, sid) => {
                const count = subjectCounts.get(sid) || 1
                subjectAverages.set(sid, Math.round(total / count))
            })
        }

        let principalRemark = "Keep striving for excellence."
        if (school.gradingScale && school.gradingScale.length > 0) {
            const match = school.gradingScale.find((g) => averageScore >= g.minScore && averageScore <= g.maxScore)
            if (match) {
                switch (match.grade) {
                    case 'A':
                        principalRemark = "Excellent performance! The student has demonstrated outstanding academic achievement and consistency across all subjects. Keep up the exceptional work."
                        break
                    case 'B':
                        principalRemark = "Very Good performance! The student has shown strong academic capability. With continued effort, excellence is within reach."
                        break
                    case 'C':
                        principalRemark = "Good performance! The student has achieved satisfactory results. Consistent effort and dedication will lead to even better outcomes."
                        break
                    case 'D':
                        principalRemark = "Fair performance. The student is encouraged to put in more effort and seek additional support to improve academic outcomes."
                        break
                    case 'F':
                        principalRemark = "The student needs significant improvement. Immediate intervention, extra coaching, and closer monitoring are strongly recommended."
                        break
                    default:
                        principalRemark = "Keep striving for excellence."
                }
            }
        }

        const result = {
            student: {
                firstName: student.firstName,
                middleName: student.middleName,
                lastName: student.lastName,
                admissionNumber: student.admissionNumber,
                className: student.currentClassId?.name || '—',
                classArm: student.currentClassId?.arm || '',
            },
            school: {
                name: school.name,
                subDomain: school.subDomain,
                motto: school.motto || "",
                caConfig: school.caConfig || null,
            },
            cycle: activeCycle ? { session: activeCycle.session, term: activeCycle.term, _id: activeCycle._id } : null,
            gradingScale: school.gradingScale || [],
            principalRemark,
            position: positionText,
            totalInClass,
            subjectsOffered: scores.length,
            totalScore,
            averageScore: Number(averageScore.toFixed(2)),
            availableCycles: availableCycles.map(c => ({ _id: c._id, session: c.session, term: c.term })),
            admissionNumber: student.admissionNumber,
            accessPin: student.accessPin,
            scores: scores.map(s => {
                const subjectIdStr = s.subjectId?._id?.toString() || ''
                const classAvg = subjectAverages.get(subjectIdStr) || null
                return {
                    subject: s.subjectId?.name || '—',
                    subjectCode: s.subjectId?.code || '',
                    class: s.classsId?.name || '—',
                    classArm: s.classsId?.arm || '',
                     ca1: s.ca1,
                     ca2: s.ca2,
                     ca3: s.ca3,
                     exam: s.exam,
                     total: s.total,
                     grade: s.grade,
                     remark: s.remark,
                     classAverage: classAvg,
                }
            })
        }

        return res.status(200).json({
            success: true,
            data: result,
            message: 'Results fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
})

module.exports = router
