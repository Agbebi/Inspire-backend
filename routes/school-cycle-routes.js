const express = require('express')
const router = express.Router()
const { protectSchool } = require('../middleware/auth')
const {
    getCycles,
    getCurrentCycle,
    addCycle,
    updateCycle,
    deleteCycle,
    publishCycle,
    startNextTerm,
    startNewSession,
} = require('../controllers/school/cycle')

router.use(protectSchool)

router.get('/cycles', getCycles)
router.get('/cycles/current', getCurrentCycle)
router.post('/cycles', addCycle)
router.put('/cycles/:id', updateCycle)
router.delete('/cycles/:id', deleteCycle)
router.put('/cycles/:id/publish', publishCycle)
router.post('/cycles/next-term', startNextTerm)
router.post('/cycles/new-session', startNewSession)

module.exports = router
