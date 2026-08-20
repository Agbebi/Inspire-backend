const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

function setupSockets(io) {
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token || socket.handshake.query?.token
            if (!token) {
                return next(new Error('Unauthorized'))
            }
            const decoded = jwt.verify(token, JWT_SECRET)
            socket.user = decoded
            next()
        } catch (err) {
            next(new Error('Unauthorized'))
        }
    })

    io.on('connection', (socket) => {
        const { userId, role, schoolId } = socket.user || {}
        if (role === 'parent' && userId) {
            socket.join(`parent:${userId}`)
        }
        if (schoolId) {
            socket.join(`school:${schoolId}`)
        }
        socket.on('disconnect', () => {})
    })
}

function emitToParent(io, parentId, event, payload) {
    io.to(`parent:${parentId}`).emit(event, payload)
}

function emitToSchool(io, schoolId, event, payload) {
    io.to(`school:${schoolId}`).emit(event, payload)
}

module.exports = { setupSockets, emitToParent, emitToSchool }
