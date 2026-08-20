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
    promoteStudents,
    getClassPerformance,
    getParents,
    getNotifications,
    markNotificationRead,
    deleteNotification,
    createNotification,
    getSchoolMessages,
    markMessageRead,
    markAllMessagesRead,
    sendSchoolMessage,
} = require('../controllers/school/manage')
const {
    getCyclesSummary,
    getClassBroadsheet,
    getCumulativeAverages,
    getPerformanceAnalytics,
} = require('../controllers/school/analytics')

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

router.get('/parents', getParents)
router.get('/notifications', getNotifications)
router.put('/notifications/:id/read', markNotificationRead)
router.delete('/notifications/:id', deleteNotification)
router.post('/notifications', createNotification)

router.get('/messages', getSchoolMessages)
router.put('/messages/:id/read', markMessageRead)
router.put('/messages/read-all', markAllMessagesRead)
router.post('/messages', sendSchoolMessage)

router.get('/analytics/cycles', getCyclesSummary)
router.get('/analytics/broadsheet', getClassBroadsheet)
router.get('/analytics/cumulative', getCumulativeAverages)
router.get('/analytics/performance', getPerformanceAnalytics)

router.get('/students', getStudents)
router.post('/students', addStudent)
router.get('/students/:id', getStudent)
router.put('/students/:id', updateStudent)
router.get('/students/:id/results', getStudentResults)
router.delete('/students/:id', deleteStudent)
router.post('/students/promote', promoteStudents)
router.get('/classes/:classId/performance', getClassPerformance)

router.get('/results', getResults)

router.get('/settings', getSchoolSettings)
router.put('/settings', updateSchoolSettings)

module.exports = router
