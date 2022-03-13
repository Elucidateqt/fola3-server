const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'socketController' })
const io = registry.getService('socketio')

const initializeListeners = () => {
    io.on('connection', (socket) => {
        logger.log('info', `user connected`)
        socket.on('message', (data) => {
            logger.log('info', `message received: ${data.message}`)
            io.emit('message', {"message": data.message})
        })
    });
}


module.exports = {initializeListeners}