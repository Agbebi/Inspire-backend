const { School, User, AcademicCycle, Class, Student, Subject, Score } = require('../../models')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')


const addSChool = async (req, res) => {


    try {
        const {
            name,
            logoUrl,
            address,
            supportEmail,
            adminName,
            adminEmail,
            adminPassword,
            session,
            term,
        } = req.body;

        if (!name || !supportEmail || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'School name, support email and admin name, email and password are required'
            })
        }

        const checkSchool = await School.findOne({ supportEmail })

        if (checkSchool) {
            return res.status(403).json({
                success: false,
                message: 'An existing school with this email exist. Please register with a new e-mail'
            })
        }

        const existingAdmin = await User.findOne({ email: adminEmail })
        if (existingAdmin) {
            return res.status(403).json({
                success: false,
                message: 'A user with this email already exists'
            })
        }

        const gradingScale = [
            {
                grade: 'A',
                minScore: 70,
                maxScore: 100,
                remark: 'Excellent'
            },
            {
                grade: 'B',
                minScore: 60,
                maxScore: 69,
                remark: 'Very Good'
            },
            {
                grade: 'C',
                minScore: 50,
                maxScore: 59,
                remark: 'Good'
            },
            {
                grade: 'D',
                minScore: 40,
                maxScore: 49,
                remark: 'Fair'
            },
            {
                grade: 'F',
                minScore: 0,
                maxScore: 39,
                remark: 'Poor'
            },
        ]


        //Create a sub domain from the name
        const baseSubDomain = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50);

        let subDomain = baseSubDomain;
        let suffix = 1;
        while (await School.findOne({ subDomain })) {
            subDomain = `${baseSubDomain}-${suffix}`;
            suffix++;
        }


        //Upload the school Logo?

        const school = new School({
            name,
            logoUrl,
            address,
            supportEmail,
            subDomain,
            gradingScale
        })

        await school.save();

        const hashedPassword = await bcrypt.hash(adminPassword, 10)

        const admin = new User({
            schoolId: school._id,
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        })

        await admin.save();

        if (session && term) {
            const cycle = new AcademicCycle({
                schoolId: school._id,
                session,
                term,
                isCurrent: true,
            })
            await cycle.save();
        }

        return res.status(200).json({
            success: true,
            data: school,
            message: 'School registered successfully'
        })


    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })

    }

}


const getSChoolInformations = async (req, res) => {


    try {
        const { id } = req.params;

        if (id) {
            const school = await School.findById(id)

            if (!school) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                })
            }

            const studentCount = await Student.countDocuments({ schoolId: id })

            return res.status(200).json({
                success: true,
                data: { ...school.toObject(), studentCount },
                message: 'School fetched successfully'
            })
        }

        const schools = await School.find().sort({ createdAt: -1 })
        const schoolIds = schools.map(s => s._id)
        const studentCounts = await Student.aggregate([
            { $match: { schoolId: { $in: schoolIds } } },
            { $group: { _id: "$schoolId", count: { $sum: 1 } } }
        ])
        const countMap = new Map(studentCounts.map(c => [String(c._id), c.count]))
        const schoolsWithCount = schools.map(s => ({
            ...s.toObject(),
            studentCount: countMap.get(String(s._id)) || 0
        }))

        return res.status(200).json({
            success: true,
            data: schoolsWithCount,
            message: 'Schools fetched successfully'
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })

    }
}

const editSchoolInformations = async (req, res) => {


    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required'
            })
        }

        const { name, logoUrl, address, supportEmail, subscriptionStatus, gradingScale, session, term } = req.body;

        const school = await School.findById(id)

        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        if (supportEmail && supportEmail !== school.supportEmail) {
            const existing = await School.findOne({ supportEmail })
            if (existing) {
                return res.status(403).json({
                    success: false,
                    message: 'An existing school with this email exist. Please register with a new e-mail'
                })
            }
        }

        const updatedSchool = await School.findByIdAndUpdate(
            id,
            {
                ...(name !== undefined && { name }),
                ...(logoUrl !== undefined && { logoUrl }),
                ...(address !== undefined && { address }),
                ...(supportEmail !== undefined && { supportEmail }),
                ...(subscriptionStatus !== undefined && { subscriptionStatus }),
                ...(gradingScale !== undefined && { gradingScale }),
            },
            { new: true }
        )

        if (session && term) {
            const existingCycle = await AcademicCycle.findOne({ schoolId: id, session, term })
            if (!existingCycle) {
                const hasCurrent = await AcademicCycle.findOne({ schoolId: id, isCurrent: true })
                const cycle = new AcademicCycle({
                    schoolId: id,
                    session,
                    term,
                    isCurrent: !hasCurrent,
                })
                await cycle.save()
            }
        }

        return res.status(200).json({
            success: true,
            data: updatedSchool,
            message: 'School updated successfully'
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })

    }
}


const removeSChool = async (req, res) => {


    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required'
            })
        }

        const school = await School.findById(id)

        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        await User.deleteMany({ schoolId: id })
        await AcademicCycle.deleteMany({ schoolId: id })
        await Class.deleteMany({ schoolId: id })
        await Student.deleteMany({ schoolId: id })
        await Subject.deleteMany({ schoolId: id })
        await Score.deleteMany({ schoolId: id })

        await School.findByIdAndDelete(id)

        res.status(200).json({
            success: true,
            message: 'School and all related data removed successfully'
        })

    } catch (error) {
        console.console.log(error);
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })

    }

}

const searchSchools = async (req, res) => {
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
}

const toggleCycleResultsLock = async (req, res) => {
    try {
        const { id } = req.params
        if (!id) {
            return res.status(400).json({ success: false, message: 'Cycle ID is required' })
        }
        const cycle = await AcademicCycle.findById(id)
        if (!cycle) {
            return res.status(404).json({ success: false, message: 'Academic cycle not found' })
        }
        cycle.resultsLocked = !cycle.resultsLocked
        await cycle.save()
        return res.status(200).json({
            success: true,
            data: cycle,
            message: cycle.resultsLocked ? 'Cycle locked successfully' : 'Cycle unlocked successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getSchoolCycles = async (req, res) => {
    try {
        const { schoolId } = req.params
        if (!schoolId) {
            return res.status(400).json({ success: false, message: 'School ID is required' })
        }
        const cycles = await AcademicCycle.find({ schoolId }).sort({ session: -1, term: 1 }).select('_id session term isPublished isCurrent resultsLocked')
        return res.status(200).json({ success: true, data: cycles, message: 'School cycles fetched successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

module.exports = { addSChool, removeSChool, getSChoolInformations, editSchoolInformations, searchSchools, toggleCycleResultsLock, getSchoolCycles }

