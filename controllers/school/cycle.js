const { AcademicCycle, Score, School } = require('../../models')
const { notifyResultPublished } = require('../parent')

const TERM_ORDER = ['First Term', 'Second Term', 'Third Term']

const getCycles = async (req, res) => {
    try {
        const cycles = await AcademicCycle.find({ schoolId: req.user.schoolId })
            .sort({ isCurrent: -1, session: -1, term: 1 })
        const school = await School.findById(req.user.schoolId).select('resultsLocked')
        return res.status(200).json({ success: true, data: { cycles, resultsLocked: school?.resultsLocked || false }, message: 'Academic cycles fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getCurrentCycle = async (req, res) => {
    try {
        const cycle = await AcademicCycle.findOne({ schoolId: req.user.schoolId, isCurrent: true })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'No current academic cycle set' })
        }
        return res.status(200).json({ success: true, data: cycle, message: 'Current cycle fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const addCycle = async (req, res) => {
    try {
        const { session, term, startDate, endDate, isCurrent } = req.body
        if (!session || !term) {
            return res.status(400).json({ success: false, message: 'Session and term are required' })
        }

        const existing = await AcademicCycle.findOne({ schoolId: req.user.schoolId, session, term })
        if (existing) {
            return res.status(409).json({ success: false, message: 'This session and term already exists' })
        }

        const shouldBeCurrent = isCurrent === true || isCurrent === 'true'

        const cycle = new AcademicCycle({
            schoolId: req.user.schoolId,
            session,
            term,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isCurrent: shouldBeCurrent,
            isPublished: false,
            resultsLocked: true,
        })

        if (shouldBeCurrent) {
            await AcademicCycle.updateMany(
                { schoolId: req.user.schoolId, _id: { $ne: cycle._id } },
                { isCurrent: false }
            )
        }

        await cycle.save()
        return res.status(201).json({ success: true, data: cycle, message: 'Academic cycle added successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const updateCycle = async (req, res) => {
    try {
        const { id } = req.params
        const { session, term, startDate, endDate, isCurrent } = req.body

        const cycle = await AcademicCycle.findOne({ _id: id, schoolId: req.user.schoolId })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }

        if (session !== undefined) cycle.session = session
        if (term !== undefined) cycle.term = term
        if (startDate !== undefined) cycle.startDate = startDate ? new Date(startDate) : null
        if (endDate !== undefined) cycle.endDate = endDate ? new Date(endDate) : null

        const shouldBeCurrent = isCurrent === true || isCurrent === 'true'
        if (isCurrent !== undefined) cycle.isCurrent = shouldBeCurrent

        if (shouldBeCurrent) {
            await AcademicCycle.updateMany(
                { schoolId: req.user.schoolId, _id: { $ne: cycle._id } },
                { isCurrent: false }
            )
        }

        await cycle.save()
        return res.status(200).json({ success: true, data: cycle, message: 'Academic cycle updated successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const deleteCycle = async (req, res) => {
    try {
        const { id } = req.params
        const cycle = await AcademicCycle.findOneAndDelete({ _id: id, schoolId: req.user.schoolId })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }
        return res.status(200).json({ success: true, message: 'Academic cycle deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const publishCycle = async (req, res) => {
    try {
        const { id } = req.params
        const { isPublished } = req.body

        const cycle = await AcademicCycle.findOne({ _id: id, schoolId: req.user.schoolId })
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }

        if (cycle.resultsLocked) {
            return res.status(403).json({ success: false, message: 'This cycle is locked and cannot be published. Please contact the administrator.' })
        }

        cycle.isPublished = isPublished === true || isPublished === 'true'
        if (cycle.isPublished) {
            cycle.publishedAt = cycle.publishedAt || new Date()
        } else {
            cycle.publishedAt = null
        }

        await cycle.save()

        await Score.updateMany(
            { schoolId: req.user.schoolId, cycleId: cycle._id },
            { isLocked: cycle.isPublished }
        )

        if (cycle.isPublished) {
            const io = req.app.get('io')
            if (io) {
                await notifyResultPublished(io, req.user.schoolId, cycle)
            }
        }

        return res.status(200).json({
            success: true,
            data: cycle,
            message: cycle.isPublished ? 'Results published successfully' : 'Results unpublished successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const startNextTerm = async (req, res) => {
    try {
        const { currentCycleId, startDate, endDate } = req.body

        if (!currentCycleId) {
            return res.status(400).json({ success: false, message: 'Current cycle ID is required' })
        }

        const currentCycle = await AcademicCycle.findOne({ _id: currentCycleId, schoolId: req.user.schoolId })
        if (!currentCycle) {
            return res.status(404).json({ success: false, message: 'Current cycle not found' })
        }

        const currentTermIndex = TERM_ORDER.indexOf(currentCycle.term)
        if (currentTermIndex === -1 || currentTermIndex >= TERM_ORDER.length - 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot auto-advance from the last term. Please create a new session manually.'
            })
        }

        const nextTerm = TERM_ORDER[currentTermIndex + 1]

        const existing = await AcademicCycle.findOne({
            schoolId: req.user.schoolId,
            session: currentCycle.session,
            term: nextTerm
        })

        if (existing) {
            return res.status(409).json({ success: false, message: `${nextTerm} already exists for this session` })
        }

        await AcademicCycle.updateMany(
            { schoolId: req.user.schoolId, isCurrent: true },
            { isCurrent: false }
        )

        const newCycle = new AcademicCycle({
            schoolId: req.user.schoolId,
            session: currentCycle.session,
            term: nextTerm,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isCurrent: true,
            isPublished: false,
            resultsLocked: true,
        })

        await newCycle.save()
        return res.status(201).json({ success: true, data: newCycle, message: `${nextTerm} started successfully` })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const startNewSession = async (req, res) => {
    try {
        const { newSession, startDate, endDate } = req.body

        if (!newSession || !newSession.trim()) {
            return res.status(400).json({ success: false, message: 'Session name is required' })
        }

        const session = newSession.trim()

        const existing = await AcademicCycle.findOne({
            schoolId: req.user.schoolId,
            session
        })

        if (existing) {
            return res.status(409).json({ success: false, message: 'This session already exists' })
        }

        await AcademicCycle.updateMany(
            { schoolId: req.user.schoolId, isCurrent: true },
            { isCurrent: false }
        )

        const newCycle = new AcademicCycle({
            schoolId: req.user.schoolId,
            session,
            term: 'First Term',
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isCurrent: true,
            isPublished: false,
            resultsLocked: true,
        })

        await newCycle.save()
        return res.status(201).json({ success: true, data: newCycle, message: `Session ${session} started successfully` })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

module.exports = {
    getCycles,
    getCurrentCycle,
    addCycle,
    updateCycle,
    deleteCycle,
    publishCycle,
    startNextTerm,
    startNewSession,
}
