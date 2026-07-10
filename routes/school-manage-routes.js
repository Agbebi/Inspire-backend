const express = require('express')
const router = express.Router()
const { protectSchool } = require('../middleware/auth')
const {
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
} = require('../controllers/school/manage')

router.use(protectSchool)

router.get('/subjects', getSubjects)
router.post('/subjects', addSubject)
router.put('/subjects/:id', updateSubject)
router.delete('/subjects/:id', deleteSubject)

router.get('/classes', getClasses)
router.post('/classes', addClass)
router.put('/classes/:id', updateClass)
router.delete('/classes/:id', deleteClass)

router.get('/teachers', getTeachers)
router.post('/teachers', addTeacher)
router.put('/teachers/:id', updateTeacher)
router.delete('/teachers/:id', deleteTeacher)

router.get('/teachers/me', getTeacherMe)
router.get('/teachers/me/classes', getTeacherClasses)
router.get('/teachers/me/results', getTeacherResults)
router.get('/teachers/me/classes/:classId/students', getTeacherClassStudents)
router.post('/teachers/me/results', addResult)
router.put('/teachers/me/results/:id', updateResult)
router.delete('/teachers/me/results/:id', deleteResult)

router.get('/results/missing', getMissingResults)
router.get('/dashboard/stats', getDashboardStats)

router.get('/students', getStudents)
router.post('/students', addStudent)
router.get('/students/:id', getStudent)
router.put('/students/:id', updateStudent)
router.get('/students/:id/results', getStudentResults)
router.delete('/students/:id', deleteStudent)

router.get('/results', getResults)

router.get('/settings', getSchoolSettings)
router.put('/settings', updateSchoolSettings)

module.exports = router
