const jwt = require('jsonwebtoken')
const { User } = require('../models')

const protectSchool = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret')
        const user = await User.findById(decoded.userId)
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            })
        }

        req.user = user
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        })
    }
}

module.exports = { protectSchool }
