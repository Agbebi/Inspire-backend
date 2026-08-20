const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Parent, School } = require('../../models')

const signToken = (parent, school) =>
    jwt.sign(
        { userId: parent._id, role: 'parent', schoolId: school._id },
        process.env.JWT_SECRET || 'supersecret',
        { expiresIn: '7d' }
    )

const registerParent = async (req, res) => {
    try {
        const { name, email, password, subDomain, phone } = req.body

        if (!name || !email || !password || !subDomain) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password and school are required'
            })
        }

        const school = await School.findOne({ subDomain: subDomain.toLowerCase() })
        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            })
        }

        const existing = await Parent.findOne({ schoolId: school._id, email: email.toLowerCase() })
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A parent account already exists for this email at this school'
            })
        }

        const hashed = await bcrypt.hash(password, 10)
        const parent = await Parent.create({
            schoolId: school._id,
            name,
            email: email.toLowerCase(),
            phone,
            password: hashed,
            students: []
        })

        const token = signToken(parent, school)
        return res.status(201).json({
            success: true,
            data: {
                user: {
                    _id: parent._id,
                    name: parent.name,
                    email: parent.email,
                    role: 'parent',
                    schoolId: school._id,
                    schoolName: school.name,
                    subDomain: school.subDomain
                },
                token
            },
            message: 'Parent account created successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const loginParent = async (req, res) => {
    try {
        const { email, password, subDomain } = req.body

        if (!email || !password || !subDomain) {
            return res.status(400).json({
                success: false,
                message: 'Email, password and school are required'
            })
        }

        const school = await School.findOne({ subDomain: subDomain.toLowerCase() })
        if (!school) {
            return res.status(404).json({ success: false, message: 'School not found' })
        }

        const parent = await Parent.findOne({ schoolId: school._id, email: email.toLowerCase() })
        if (!parent) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const valid = await bcrypt.compare(password, parent.password)
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const token = signToken(parent, school)
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    _id: parent._id,
                    name: parent.name,
                    email: parent.email,
                    role: 'parent',
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
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

const getMe = async (req, res) => {
    try {
        const parent = req.parent
        return res.status(200).json({
            success: true,
            data: {
                _id: parent._id,
                name: parent.name,
                email: parent.email,
                phone: parent.phone,
                schoolId: parent.schoolId
            },
            message: 'Parent fetched'
        })
    } catch (error) {
        res.status(500).json({ success: false, message: 'There was an error!' })
    }
}

module.exports = { registerParent, loginParent, getMe }
