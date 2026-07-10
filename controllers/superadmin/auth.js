const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User } = require('../../models')

const registerSuperAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            })
        }

        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(403).json({
                success: false,
                message: 'A user with this email already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const superAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'superadmin'
        })

        await superAdmin.save()

        const token = jwt.sign(
            { userId: superAdmin._id, role: 'superadmin' },
            process.env.JWT_SECRET || 'supersecret',
            { expiresIn: '7d' }
        )

        return res.status(201).json({
            success: true,
            data: {
                user: {
                    _id: superAdmin._id,
                    name: superAdmin.name,
                    email: superAdmin.email,
                    role: superAdmin.role
                },
                token
            },
            message: 'Super admin registered successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'There was an error!'
        })
    }
}

const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            })
        }

        const user = await User.findOne({ email, role: 'superadmin' })
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
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
                    role: user.role
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

module.exports = { registerSuperAdmin, loginSuperAdmin }
