const jwt = require('jsonwebtoken')
const { Parent } = require('../models')

const protectParent = async (req, res, next) => {
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
        const parent = await Parent.findById(decoded.userId)
        if (!parent) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            })
        }

        req.parent = parent
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        })
    }
}

module.exports = { protectParent }
