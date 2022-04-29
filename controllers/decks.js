db = require('../models')
const { v4: uuidv4 } = require('uuid')
const Deck = db.deck
const Card = db.card
const User = db.user
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Decks Controller' })
const { validationResult } = require('express-validator')

const PUBLIC_EMAIL = process.env.PUBLIC_ACC_MAIL || 'public@apiTest.com'

exports.createDeck = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let deckName = req.body.name,
        owner = null,
        cardIds = []
    try{
        const user = await User.getUserByUuid(req.body.owner)
        if(!user){
            return res.sendStatus(400)
        }
        owner = user._id
        if(req.body.cards){
            const cards = await Card.getCards({'cardUuids': req.body.cards})
            cardIds = cards.map(card => {return card._id})
        }
        const config = {
            "uuid": uuidv4(),
            "name": deckName,
            "owner": owner,
            "public": req.body.public || false,
            "cards": cardIds
        }
        const deck = await Deck.createDeck(config.uuid, config.name, config.cards, config.owner)
        delete deck._id
        deck.cards.forEach(card => {
            delete card._id
            delete card.__v
        })
        logger.log('info', `Cardset with uuid ${deck.uuid} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "deck": deck})
    }catch(err){
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}

exports.createBearerDeck = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let deckName = req.body.name,
        owner = req.locals.user._id,
        cardIds = []
    try{
        const cards = await Card.getCards({'cardUuids': req.body.cards})
        cardIds = cards.map(card => card._id)
        const config = {
            "uuid": uuidv4(),
            "name": deckName,
            "owner": owner,
            "public": req.body.public || false,
            "cards": cardIds
        }
        const deck = await Deck.createDeck(config.uuid, config.name, config.cards, config.owner)
        delete deck._id
        deck.owner = req.locals.user.uuid
        deck.cards.forEach(card => {
            delete card._id
            delete card.__v
        })
        logger.log('info', `Deck with uuid ${deckName} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "deck": deck})
    }catch(err){
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}


exports.getDecks = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    const public = (req.query.public === 'true')
    let owner,
        ownerId
    try {
        if(req.query.owner === 'public'){
            owner = await User.getUserByEmail(PUBLIC_EMAIL)
            if(!owner){
                logger.error('Public user not found in DB')
                return res.sendStatus(500)
            }
        }else{
            owner = await User.getUserByUuid(req.query.owner)
            if(!owner){
                return res.sendStatus(404)
            }
        }
        ownerId = owner._id
        if(public === false){
            const bearerIsOwner = ownerId !== null && ownerId.equals(req.locals.user._id)
            if(!bearerIsOwner && !req.locals.user.effectivePermissions.some(permission => permission.name === 'API:DECKS:MANAGE')){
                return res.sendStatus(403)
            }
        }
        const config = {
            "public": public,
            "owner": ownerId
        }
        const decks = await Deck.getDecks(config)
        sets.forEach(deck => {
            delete deck._id
            delete deck._v
            deck.cards = deck.cards.map(card => {
                return {
                    "uuid": card.uuid,
                    "name": card.name,
                    "cardType": card.cardType
                }
            })
            deck.owner = req.params.owner
        })
        res.json({"decks": decks})
    } catch (err) {
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }

}

exports.returnDeck = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    delete req.locals.deck._id
    delete req.locals.deck._v
    res.json({ "deck": req.locals.deck})

}


exports.getBearerDecks = async (req, res) => {
    const public = (req.query.public === 'true')
    try {
        const config = {
            "public": public,
            "ownerId": req.locals.user._id
        }
        const decks = await Deck.getDecks(config)
        decks.forEach(deck => {
            delete deck._id
            delete deck._v
            deck.cards.forEach(card => {
                delete card._id
                delete card.__v
            })
            deck.owner = req.locals.user.uuid
        })
        res.json({"decks": decks})
    } catch (err) {
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}

exports.getDeckByUuid = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        const deck = await Deck.getDeckByUuid(req.params.deckId)
        delete deck._id
        deck.cards.forEach(card => {
            delete card._id
            delete card.__v
        })
        logger.log('info', `Deck with uuid ${deck.uuid} loaded for user ${req.locals.user.uuid}`)
        res.status(200).send({ "deck": deck})
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.updateDeck = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let owner = null,
        cardIds = null
    try {
        const user = await User.getUserByUuid(req.body.owner)
        owner = user._id || req.locals.deck.owner
        const cards = await Card.getCards({'cardUuids': req.body.cards})
        cardIds = cards.map(card => {return card._id})
        const config = {
            "name": req.body.name || req.locals.deck.name,
            "public": req.body.public || req.locals.deck.public,
            "owner": owner,
            "cards": cardIds
        }
        await Deck.updateDeck(req.params.deckId, config)
        logger.log('error', `User ${req.locals.user.uuid} updated deck ${req.params.deckId}`)
        res.sendStatus(200)
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
    }    
}

exports.deleteDeck = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await Deck.deleteDeck(req.locals.deck._id)
        logger.log('info', `User ${req.locals.user.uuid} deleted deck ${req.locals.deck.uuid}`)
        res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}