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

        socket.on('playInteraction', (data) => {
            logger.log('info', `playInteraction received: ${data.card}`)
            io.emit('playInteraction', {"card": data.card})
        })

        socket.on('addCard', (data) => {
            logger.log('info', `addCard received ${data.card.uuid}`)
            io.emit('addCard', {"card": data.card, "location": data.location})
        })

        socket.on('removeCard', (data) => {
            logger.log('info', `removeCard received ${data.cardId}`)
            io.emit('removeCard', {"cardId": data.cardId, "location": data.location})
        })

        socket.on('updateCard', (data) => {
            logger.log('info', `updateCard received ${data.card.uuid}`)
            io.emit('updateCard', {"card": data.card, "location": data.location})
        })
    });
}


module.exports = {initializeListeners}