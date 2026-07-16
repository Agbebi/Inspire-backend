const express = require('express')
const router = express.Router()
const { addSChool, removeSChool, editSchoolInformations, getSChoolInformations, toggleCycleResultsLock, getSchoolCycles } = require('../controllers/superadmin')
const { registerSuperAdmin, loginSuperAdmin } = require('../controllers/superadmin/auth')

router.post('/school/add', addSChool)
router.get('/school', getSChoolInformations)
router.get('/school/:id', getSChoolInformations)
router.put('/school/:id', editSchoolInformations)
router.delete('/school/:id', removeSChool)
router.get('/school/:schoolId/cycles', getSchoolCycles)
router.put('/cycles/:id/toggle-results-lock', toggleCycleResultsLock)

router.post('/register', registerSuperAdmin)
router.post('/login', loginSuperAdmin)

module.exports = router
