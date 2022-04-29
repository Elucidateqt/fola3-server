
const db = require('../models')
const Card = db.card
const CardSet = db.cardset
const User = db.user
const registry = require('../lib/registry')
const { v4: uuidv4 } = require('uuid')
const logger = registry.getService('logger').child({ component: 'CardController'})
const { validationResult } = require('express-validator')

exports.createCard = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        let cardName = req.body.name,
        cardDescription = req.body.description
        const userSets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        const config = {
            "uuid": uuidv4(),
            "cardset": userSets[0]._id,
            "name": cardName,
            "description": cardDescription,
            "cardType": req.body.type,
            "interactionSubjectLeft": req.body.interactionSubjectLeft,
            "interactionSubjectRight": req.body.interactionSubjectRight,
            "interactionDirection": req.body.interactionDirection,
            "imageUrl": req.body.imageUrl,
            "externalLink": req.body.externalLink,
            "LTEsensors": req.body.lteSensors,
            "requiredSensors": req.body.requiredSensors
        }
        const card = await Card.createCard(config)
        logger.log('info', `User ${req.locals.user.uuid} created card ${card.uuid}`)
        delete card._id
        delete card.__v
        card.cardset = userSets[0].uuid
        res.json({'card': card})
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getCards = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try {
        const config = {}
        if(req.query.type){
            config.cardType = req.query.type
        }
        if(req.query.interactionSubjectLeft){
            config.interactionSubjectLeft = req.query.interactionSubjectLeft
        }
        if(req.query.interactionSubjectRight){
            config.interactionSubjectRight = req.query.interactionSubjectRight
        }
        if(req.query.interactionDirection){
            config.interactionDirection = req.query.interactionDirection
        }
        config.limit = parseInt(req.query.limit)
        config.offset = parseInt(req.query.offset)

        const setIds = req.locals.cardsets.map(set => set._id)
        config.cardsets = setIds

        const cards = await Card.getCards(config)

        cards.forEach(card => {
            delete card._id
            delete card.__v
            card.cardset = card.cardset[0].uuid
        })
        res.json({"cards": cards})
        
    } catch (err) {
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }

}

exports.updateCard = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let setId = req.locals.card.cardset._id
    try {
        if(req.body.cardset){
            const set = await CardSet.getCardSetByUuid(req.body.cardset)
            if(!set){
                return res.sendStatus(400)
            }
            setId = set._id
        }
        const config = {
            "name": req.body.name || req.locals.card.name,
            "cardset": setId,
            "description": req.body.description || req.locals.card.description,
            "cardType": req.body.type || req.locals.card.cardType,
            "cardset": setId,
            "interactionSubjectLeft": req.body.interactionSubjectLeft || req.locals.card.interactionSubjectLeft,
            "interactionSubjectRight": req.body.interactionSubjectRight || req.locals.card.interactionSubjectRight,
            "interactionDirection": req.body.interactionDirection || req.locals.card.interactionDirection,
            "imageUrl": req.body.imageUrl || null,
            "externalLink": req.body.externalLink || null,
            "LTEsensors": req.body.lteSensors || req.locals.card.LTEsensors,
            "requiredSensors": req.body.requiredSensors || req.locals.card.requiredSensors
        }
        const newCard = await Card.updateCard(req.locals.card.uuid, config)
        const cardsets = await CardSet.getCardSets({setIds: [newCard.cardset]})
        delete newCard._id
        delete newCard.__v
        newCard.cardset = cardsets[0].uuid
        logger.log('info', `User ${req.locals.user.uuid} updated card ${req.locals.card.uuid}`)
        res.json({"card": newCard})
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
    }    
}

exports.getCard = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    delete req.locals.card._id
    delete req.locals.card.__v
    req.locals.card.cardset = req.locals.card.cardset[0].uuid
    logger.log('info', `Loaded card ${req.locals.card.uuid} for user ${req.locals.user.uuid}`)
    res.json({"card": req.locals.card})
}

exports.getCardsOfBearer = async (req, res) => {
    try{
        let container = [],
        idList = []

        const ownCardsets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        container = container.concat(ownCardsets)

        const publicCardSets = await CardSet.getPublicCardSets()
        container = container.concat(publicCardSets)

        if(req.locals.user.effectivePermissions.some(permission => permission.name === 'API:CARDSETS:MANAGE')){
            const wipCardSets = await CardSet.getWIPCardSets()
            container = container.concat(wipCardSets)
        }

        container.forEach(cardset => {
            idList = idList.concat(cardset.cards)
        })

        const config = {
            "cardIds": idList,
            "offset": parseInt(req.query.offset) || 0,
            "limit": parseInt(req.query.limit) || 5
        }
        
        const cardlist = await Card.getCards(config)

        res.json({ "cardlist": cardlist })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
    
}

exports.deleteCard = async (req, res) => {
    try{
        await Card.deleteCard(req.locals.card.uuid)
        res.sendStatus(204)
        logger.log("info", `user ${req.locals.user.uuid} deleted card ${req.locals.card.uuid}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}