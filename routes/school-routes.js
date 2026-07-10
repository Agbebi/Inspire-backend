const express = require('express')
const router = express.Router()
const { loginSchoolUser, getSchoolInfo, findSchoolByEmail } = require('../controllers/school/auth')

router.post('/login', loginSchoolUser)
router.get('/info/:slug', getSchoolInfo)
router.get('/find', findSchoolByEmail)

module.exports = router
