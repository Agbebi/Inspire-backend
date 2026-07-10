const express = require('express')
const router = express.Router()
const { Student, Score, School } = require('../models')

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

router.get('/results/public', async (req, res) => {
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

        const scores = await Score.find({ studentId: student._id })
            .populate('subjectId', 'name code')
            .populate('classsId', 'name arm')
            .sort({ createdAt: -1 })

        const totalScore = scores.reduce((sum, s) => sum + (s.total || 0), 0)
        const averageScore = scores.length > 0 ? totalScore / scores.length : 0

        let positionText = "—"
        let totalInClass = 0

        if (student.currentClassId) {
            const classStudents = await Student.find({ currentClassId: student.currentClassId }).select('_id')
            const classStudentIds = classStudents.map((s) => s._id)
            totalInClass = classStudentIds.length

            if (totalInClass > 0) {
                const classScores = await Score.find({ studentId: { $in: classStudentIds } })
                    .select('studentId total')

                const totalsByStudent = new Map()
                classScores.forEach((s) => {
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
            },
            gradingScale: school.gradingScale || [],
            principalRemark,
            position: positionText,
            totalInClass,
            subjectsOffered: scores.length,
            totalScore,
            averageScore: Number(averageScore.toFixed(2)),
            scores: scores.map(s => ({
                subject: s.subjectId?.name || '—',
                subjectCode: s.subjectId?.code || '',
                class: s.classsId?.name || '—',
                classArm: s.classsId?.arm || '',
                ca1: s.ca1,
                ca2: s.ca2,
                exam: s.exam,
                total: s.total,
                grade: s.grade,
                remark: s.remark,
            }))
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
