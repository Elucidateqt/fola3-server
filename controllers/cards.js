
const db = require('../models')
const Card = db.card
const CardSet = db.cardset
const User = db.user
const registry = require('../lib/registry')
const { v4: uuidv4 } = require('uuid')
const logger = registry.getService('logger').child({ component: 'CardController'})
const { validationResult } = require('express-validator')

exports.createCard = async (req, res) => {
    
    try{
        let cardNames = req.body.names || {"en-US": "New Set"},
        cardDescriptions = req.body.descriptions || {"en-US": "New Description"}
        const config = {
            "uuid": uuidv4(),
            "names": cardNames,
            "descriptions": cardDescriptions,
            "cardType": req.body.cardType,
            "interactionSubjectLeft": req.body.interactionSubjectLeft,
            "interactionSubjectRight": req.body.interactionSubjectRight,
            "interactionDirection": req.body.interactionDirection,
            "imageUrl": req.body.imageUrl || "https://loremflickr.com/320/240",
            "knowledbaseUrl": req.body.knowledbaseUrl || "https://knowhow.studiumdigitale.uni-frankfurt.de/",
            "LTEsensors": req.body.lteSensors || [],
            "requiredSensors": req.body.requiredSensors || []
        }
        const card = await Card.createCard(config)
        logger.log('info', `User ${req.locals.user.uuid} created permission ${req.body.name}`)
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
    let ownerId = null,
    cardIds = []
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
        if(req.query.owner){
            const owner = await User.getUserByUuid(req.query.owner)
            if(!owner){
                return res.json({"cards": []})
            }
            const ownerSets = await CardSet.getCardSetsOfUser(owner._id)
            ownerSets.forEach(set => cardIds = cardIds.concat(set.cards))
        }
        const bearerIsOwner = ownerId !== null && ownerId.equals(req.locals.user._id)
        if(!bearerIsOwner && !req.locals.user.effectivePermissions.includes('API:CARDS:MANAGE')){
            return res.sendStatus(403)
        }
        if(cardIds.length > 0) {
            config.cardIds = cardIds
        }
        const cards = await Card.getCards(config)
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
    try {
        const config = {
            "names": req.body.names || req.locals.card.names,
            "cardType": req.body.cardType || req.locals.card.cardType,
            "interactionSubjectLeft": req.body.interactionSubjectLeft || req.locals.card.interactionSubjectLeft,
            "interactionSubjectRight": req.body.interactionSubjectRight || req.locals.card.interactionSubjectRight,
            "interactionDirection": req.body.interactionDirection || req.locals.card.interactionDirection,
            "imageUrl": req.body.imageUrl || req.locals.card.imageUrl,
            "knowledbaseUrl": req.body.knowledbaseUrl || req.locals.card.knowledbaseUrl,
            "LTEsensors": req.body.lteSensors || req.locals.card.LTEsensors,
            "requiredSensors": req.body.requiredSensors || req.locals.card.requiredSensors
        }
        const newCard = await Card.updateCard(req.locals.card.uuid, config)
        delete newCard._id
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
    logger.log('info', `Loaded card ${req.locals.card.uuid} for user ${req.locals.user.uuid}`)
    res.json("card", req.locals.card)
}

exports.getCardsAvailableToBearer = async (req, res) => {
    try{
        let container = [],
        idList = []

        const ownCardsets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        container = container.concat(ownCardsets)

        const publicCardSets = await CardSet.getPublicCardSets()
        container = container.concat(publicCardSets)

        if(req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')){
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
        logger.log("info", `user ${req.locals.user.uuid} deleted permission ${req.locals.card.uuid}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}