const jwt = require('jsonwebtoken')
const { v4: uuidv4, validate: isUuid } = require('uuid')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'socketController' })
const io = registry.getService('socketio')
const db = require('../models')
const User = db.user
const Role = db.role
const Board = db.board
const Deck = db.deck

let roomMap = {}

const initializeListeners = () => {
    io.on('connection', async (socket) => {
        logger.log('info', `user connected`)
        /*const user = await User.getUserByUuid(data.userId)
        if(!user){
            socket.emit('exception', {message: "auth.auth_failed"})
            return
        }
        //add to connected devices of user
        socket.join(user.uuid)
        socket.userUuid = user.uuid*/
        

        socket.on("leaveBoard", async (data) => {

            if(!isUuid(data.userId)){
                socket.emit('exception', {message: 'user.id_invalid'})
                return
            }
            if(!isUuid(data.boardId)){
                socket.emit('exception', {message: 'board.id_invalid'})
                return
            }

            //validate user
            const user = await User.getUserByUuid(data.userId)
            if(!user){
                socket.emit('exception', {message: "auth.auth_failed"})
                return
            }

            //load board and validate membership
            const {board, userIndex} = await loadBoard(user, data.boardId)

            if(board === null || userIndex === null){
                socket.emit('exception', {message: 'board.id_invalid'})
                return
            }


            if(roomMap.hasOwnProperty(board.uuid)){
                roomMap[board.uuid] = roomMap[board.uuid].filter(uuid => uuid !== user.uuid)
                io.to(board.uuid).emit('playerLeft', {"userId": user.uuid})
            }
            logger.log('info', `user ${user.uuid} left board ${board.uuid}`)
        });


        socket.on("disconnecting", () => {
            console.log("socket disconnecting")
            console.log(socket.rooms); // the Set contains at least the socket ID
        });


        socket.on('joinBoard', async (data) => {
            if(!isUuid(data.userId)){
                socket.emit('exception', {message: 'user.id_invalid'})
                return
            }
            if(!isUuid(data.boardId)){
                socket.emit('exception', {message: 'board.id_invalid'})
                return
            }

            //validate user
            const user = await User.getUserByUuid(data.userId)
            if(!user){
                socket.emit('exception', {message: "auth.auth_failed"})
                return
            }

            socket.join(user.uuid)
            
            //load board and validate membership
            const {board, userIndex} = await loadBoard(user, data.boardId)
            if(board === null || userIndex === null){
                socket.emit('exception', {message: "auth.auth_failed"})
                return
            }
            if(!roomMap.hasOwnProperty(board.uuid)){
                roomMap[board.uuid] = new Array()
            }
            socket.join(board.uuid)
            const isMember = roomMap[board.uuid].includes(user.uuid)
            if(!isMember){
                roomMap[board.uuid].push(user.uuid)
                socket.broadcast.to(board.uuid).emit('playerJoined', {"user": board.members[userIndex]})
            }
            board.members = board.members.filter(member => roomMap[board.uuid].includes(member.uuid))
            socket.emit('setBoard', {"board": board})
            logger.log('info', `User ${user.uuid} connected to board ${board.uuid}`)
        })

        socket.on('message', (data) => {
            logger.log('info', `message received: ${data.message}`)
            io.emit('message', {"message": data.message})
        })

        socket.on('playInteraction', async (data) => {
            try {
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.cardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
            
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }
                
                if(data.cardOrigin && data.cardOrigin.container && data.cardOrigin.container === 'hand'){
                    if(!isUuid(data.cardOrigin.playerId)){
                        socket.emit('exception', {message: 'action_invalid'})
                        return
                    }
                    const member = board.members.find(member => member.uuid === data.cardOrigin.playerId)
                    member.cards = member.cards.filter(cardId => cardId !== data.cardId)

                    await Board.updateMemberCards(member._id, member.cards)
                }
                if(board.boardState[data.column] === undefined){
                    board.boardState[data.column] = [data.cardId]
                }else{
                    board.boardState[data.column][data.index] = data.cardId
                }

                await Board.updateBoardState(board._id, board.boardState)

                io.to(board.uuid).emit('interactionPlayed', data)
                logger.log('info', `playInteraction received: ${data.card}`)
                
            } catch (err) {
                logger.error(err)
                socket.emit('exception', {message: 'errors.default'})
            }
        })

        socket.on('pickUpInteraction', async (data) => {
            try {
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.cardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
            
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                
                const card = board.cards.find(card => card.uuid === data.cardId)

                if(!card){
                    socket.emit('exception', {message: "action_invalid"})
                    return
                }
                
                if(board.boardState[data.column] === undefined){
                    socket.emit('exception', {message: "action_invalid"})
                    return
                }


                let cardList = [card.uuid]
                if(card.hasOwnProperty('addonsBot')){
                    cardList = cardList.concat(card.addonsBot)
                    delete card.addonsBot
                }

                if(card.hasOwnProperty('addonsTop')){
                    cardList = cardList.concat(card.addonsTop)
                    delete card.addonsTop
                }

                const member = board.members.find(member => member.uuid === data.userId)
                member.cards = member.cards.concat(cardList)

                await Board.updateMemberCards(member._id, member.cards)
                
                board.boardState[data.column] = board.boardState[data.column].filter(cardId => cardId !== data.cardId)
                if(board.boardState[data.column].length === 0){
                    board.boardState.splice(data.column, 1)
                }

                await Board.updateBoardState(board._id, board.boardState)

                io.to(board.uuid).emit('interactionPickedUp', data)
                logger.log('info', `pickUpInteraction received: ${data.card}`)
                
            } catch (err) {
                logger.error(err)
                socket.emit('exception', {message: 'errors.default'})
            }
        })

        socket.on('createCard', async (data) => {
            if(!isUuid(data.userId)){
                socket.emit('exception', {message: 'action_invalid'})
                return
            }
            if(!isUuid(data.boardId)){
                socket.emit('exception', {message: 'action_invalid'})
                return
            }
        
            
            //validate user
            const user = await User.getUserByUuid(data.userId)
            if(!user){
                socket.emit('exception', {message: "auth.auth_failed"})
                return
            }
            
            //load board and validate membership
            const {board, userIndex} = await loadBoard(user, data.boardId)
            if(board === null || userIndex === null){
                socket.emit('exception', {message: 'board.id_invalid'})
                return
            }

            data.card.uuid = uuidv4()
            board.cards.push(data.card)
            board.members[userIndex].cards.push(data.card.uuid)
            await Board.updateBoardCards(board._id, board.cards)
            await Board.updateMemberCards(board.members[userIndex]._id, board.members[userIndex].cards)
            io.to(board.uuid).emit('cardsCreated', {"newCards": [data.card], "location": { container: 'hand', playerId: user.uuid }})
        })


        socket.on('attachCard', async (data) => {
            try { 
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.cardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
            
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }
                const card = board.cards.find(card => card.uuid === data.target)
                if(!card){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }

                const addon = board.cards.find(card => card.uuid === data.cardId)
                
                if(data.cardOrigin && data.cardOrigin.container && data.cardOrigin.container === 'hand'){
                    if(!isUuid(data.cardOrigin.playerId)){
                        socket.emit('exception', {message: 'action_invalid'})
                        return
                    }
                    const member = board.members.find(member => member.uuid === data.cardOrigin.playerId)
                    member.cards = member.cards.filter(cardId => cardId !== data.cardId)
                    await Board.updateMemberCards(member._id, member.cards)
                }

                switch (addon.cardType) {
                    case 'LET':
                        if(card.hasOwnProperty('addonsTop')){
                            card.addonsTop.push(data.cardId)
                        }else{
                            card.addonsTop = [data.cardId]
                        }
                        break;
                    case 'what':
                        if(card.hasOwnProperty('addonsBot')){
                            card.addonsBot.push(data.cardId)
                        }else{
                            card.addonsBot = [data.cardId]
                        }
                        break;
                    default:
                        break;
                }
                await Board.updateBoardCards(board._id, board.cards)

                io.to(board.uuid).emit('cardAttached', data)



                
            } catch (error) {
                logger.error(error)
                
            }
        })

        socket.on('detachCard', async (data) => {
            try { 
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.addonId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }

                if(!isUuid(data.hostCardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
            
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }
                const addon = board.cards.find(card => card.uuid === data.addonId)
                if(!addon){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                const hostCard = board.cards.find(card => card.uuid === data.hostCardId)
                if(!hostCard){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }

                switch (addon.cardType) {
                    case "LET":
                        hostCard.addonsTop = hostCard.addonsTop.filter(cardId => cardId !== addon.uuid)
                        break;
                    case "what":
                        hostCard.addonsBot = hostCard.addonsBot.filter(cardId => cardId !== addon.uuid)
                    default:
                        break;
                }

                const member = board.members.find(member => member.uuid === data.userId)
                member.cards.push(addon.uuid)
                await Board.updateMemberCards(member._id, member.cards)

                await Board.updateBoardCards(board._id, board.cards)

                io.to(board.uuid).emit('cardDetached', data)                
            } catch (error) {
                logger.error(error)
                
            }
        })

        socket.on('deleteCard', async (data) => {
            console.log("deleteCard received", data)
            try { 
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.cardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }
                const card = board.cards.find(card => card.uuid === data.cardId)
                if(!card){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                
                let cardList = []
                if(card.hasOwnProperty('addonsBot')){
                    cardList = cardList.concat(card.addonsBot)
                    delete card.addonsBot
                }
                
                if(card.hasOwnProperty('addonsTop')){
                    cardList = cardList.concat(card.addonsTop)
                    delete card.addonsTop
                }
                
                const actor = board.members.find(member => member.uuid === user.uuid)
                if(!actor){
                    socket.emit('exception', {message: "action_invalid"})
                    return
                }
                
                actor.cards = actor.cards.concat(cardList)
                
                await Board.updateMemberCards(actor._id, actor.cards)
                
                
                switch (data.location.container) {
                    case 'hand':
                        const member = board.members.find(member => member.uuid === data.location.playerId)
                        if(!member){
                            socket.emit('exception', {message: "action_invalid"})
                            return
                        }
                        member.cards = member.cards.filter(cardId => cardId !== card.uuid)
                        await Board.updateMemberCards(member._id, member.cards)
                        break;
                    case 'board':
                        if(board.boardState[data.location.column] === undefined){
                            socket.emit('exception', {message: "action_invalid"})
                            return
                        }
                        board.boardState[data.location.column] = board.boardState[data.location.column].filter(cardId => cardId !== card.uuid)
                        await Board.updateBoardState(board._id, board.boardState)
                        break;
                        
                        default:
                            break;
                }
                board.cards = board.cards.filter(boardCard => boardCard.uuid !== card.uuid)       
                await Board.updateBoardCards(board._id, board.cards)

                
                logger.log('info', `removeCard received ${data.cardId}`)
                io.to(board.uuid).emit('cardDeleted', data)
            }catch(err){
                logger.error(err)
                socket.emit('exception', err)
            }
        })

        socket.on('updateCard', async (data) => {
            try { 
                if(!isUuid(data.userId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.boardId)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                if(!isUuid(data.config.uuid)){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }

                
                
                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                
                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)
                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }

                const card = board.cards.find(card => card.uuid === data.config.uuid)
                if(!card){
                    socket.emit('exception', {message: 'action_invalid'})
                    return
                }
                
                const config = data.config
                card.name = config.name || card.name
                card.description = config.description || card
                card.cardType = config.cardType || card.cardType,
                card.imageUrl = config.imageUrl || card.imageUrl
                card.externalLink = config.externalLink || card.externalLink
                card.interactionSubjectLeft = config.interactionSubjectLeft || card.interactionSubjectLeft,
                card.interactionSubjectRight = config.interactionSubjectRight || card.interactionSubjectRight
                card.interactionDirection = config.interactionDirection || card.interactionDirection
                card.LTEsensors = config.LTEsensors || card.LTEsensors
                card.requiredSensors = config.requiredSensors || card.requiredSensors

                await Board.updateBoardCards(board._id, board.cards)

                io.to(board.uuid).emit('cardUpdated', {card: card})
            }catch(err){
                logger.error(err)
                socket.emit('exception', err)
            }
        })

        socket.on('importDeck', async (data) => {
            
            try {

                //Validate data
                if(!isUuid(data.userId)){
                    throw new Error('board.id_invalid')
                }
                if(!isUuid(data.boardId)){
                    throw new Error('board.id_invalid')
                }
                if(!isUuid(data.deckId)){
                    throw new Error('deck.id_invalid')
                }

                //validate user
                const user = await User.getUserByUuid(data.userId)
                if(!user){
                    socket.emit('exception', {message: "auth.auth_failed"})
                    return
                }
                socket.user = user

                //load board and validate membership
                const {board, userIndex} = await loadBoard(user, data.boardId)

                if(board === null || userIndex === null){
                    socket.emit('exception', {message: 'board.id_invalid'})
                    return
                }


                //load deck and validate ownership
                const deck = await loadUserDeck(user, data.deckId)

                //create copies of cards for board
                let newCards = []
                deck.cards.forEach(card => {
                    newCards.push({
                        uuid: uuidv4(),
                        name: card.name,
                        description: card.description,
                        cardType: card.cardType,
                        imageUrl: card.imageUrl,
                        externalLink: card.externalLink,
                        interactionSubjectLeft: card.interactionSubjectLeft,
                        interactionSubjectRight: card.interactionSubjectRight,
                        interactionDirection: card.interactionDirection,
                        LTEsensors: card.LTEsensors,
                        requiredSensors: card.requiredSensors,
                    })
                })
                board.cards = board.cards.concat(newCards)
                await Board.updateBoardCards(board._id, board.cards.concat(newCards))
                Board.updateMemberCards(board.members[userIndex]._id, board.members[userIndex].cards.concat(newCards.map(card => card.uuid)))
                io.to(board.uuid).emit('cardsCreated', {"newCards": newCards, "location": { container: 'hand', playerId: user.uuid }})
            } catch (err) {
                logger.error(err)
                socket.emit('exception', err)
            }
        })
    });
}

const loadBoard = async (user, boardId) => {
    try {
        const board = await Board.getBoardByUuid(boardId)
        if(!board){
            return {board: null, userIndex: null}
        }
        const index = board.members.map(member => member.uuid).indexOf(user.uuid)
        if(index === -1){
            return {board: board, userIndex: null}
        }
        return {board: board, userIndex: index}
    } catch (err) {
        console.error(err)
    }
}

const loadUserDeck = async (user, deckId) => {
    const deck = await Deck.getDeckByUuid(deckId)
    if(!deck.owner._id.equals(user._id)){
        throw new Error('deck.not_owner')
    }
    return deck
}


module.exports = {initializeListeners}