const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User, School } = require('../../models')

const loginSchoolUser = async (req, res) => {
    try {
        const { email, password, subDomain } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        if (subDomain) {
            const matchingSchool = await School.findOne({
                _id: user.schoolId,
                subDomain
            })
            if (!matchingSchool) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                })
            }
        }

        const school = await School.findOne({ _id: user.schoolId })
        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            })
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role, schoolId: school._id },
            process.env.JWT_SECRET || 'supersecret',
            { expiresIn: '7d' }
        )

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: school._id,
                    schoolName: school.name,
                    subDomain: school.subDomain
                },
                token
            },
            message: 'Login successful'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
}

const getSchoolInfo = async (req, res) => {
    try {
        const { slug } = req.params

        const school = await School.findOne({ subDomain: slug })
            .select('name logoUrl subDomain address supportEmail')

        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        return res.status(200).json({
            success: true,
            data: school,
            message: 'School fetched successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
}

const findSchoolByEmail = async (req, res) => {
    try {
        const { email } = req.query

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            })
        }

        const user = await User.findOne({ email }).select('schoolId')
        if (!user || !user.schoolId) {
            return res.status(404).json({
                success: false,
                message: 'No school found for this email'
            })
        }

        const school = await School.findOne({ _id: user.schoolId })
            .select('name subDomain')
        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'No school found for this email'
            })
        }

        return res.status(200).json({
            success: true,
            data: school,
            message: 'School found'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
}

module.exports = { loginSchoolUser, getSchoolInfo, findSchoolByEmail }
