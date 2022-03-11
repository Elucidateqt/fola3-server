db = require('../models')
const { v4: uuidv4 } = require('uuid')
const CardSet = db.cardset
const Card = db.card
const User = db.user
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'cardSetController' })
const { validationResult } = require('express-validator')

exports.createCardSet = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let setNames = req.body.names || {"en-US": "New Set"},
        owner = null,
        cardIds = []
    try{
        if(req.body.owner){
            const user = await User.getUserByUuid(req.body.owner)
            if(!user){
                return res.sendStatus(400)
            }
            owner = user._id
        }
        if(req.body.cards){
            const cards = await Card.getCards(req.body.cards)
            cardIds = cards.map(card => {return card._id})
        }
        const config = {
            "uuid": uuidv4(),
            "names": setNames,
            "owner": owner,
            "public": req.body.public || false,
            "iconUrl": req.body.iconUrl || '',
            "cards": cardIds
        }
        const cardset = await CardSet.createCardSet(config.uuid, config.names, config.iconUrl, config.cards, config.public, config.owner)
        delete cardset._id
        logger.log('info', `Cardset with uuid ${cardset.uuid} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "cardset": cardset})
    }catch(err){
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }
}

exports.getCardSets = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    const public = (req.query.public === true)
    let ownerId = null
    try {
        if(req.query.owner){
            const owner = await User.getUserByUuid(req.query.owner)
            if(!owner){
                return res.json({"cardsets": []})
            }
            ownerId = owner._id
        }
        if(public === false){
            const bearerIsOwner = ownerId !== null && ownerId.equals(req.locals.user._id)
            if(!bearerIsOwner && !req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')){
                logger.debug(`forbidden ${req.locals.user}`)
                return res.sendStatus(403)
            }
        }
        const config = {
            "public": public,
        }
        if(ownerId !== null) {
            config.owner = ownerId
        }
        const sets = await CardSet.getCardSets(config)
        sets.forEach(set => {
            delete set._id
            delete set._v
            set.owner = set.owner.length > 0 ? set.owner[0].uuid : null
        })
        res.json({"cardsets": sets})
    } catch (err) {
        logger.log('error', err)
        res.status(500).send({ "message": err })
    }

}

exports.getCardSetByUuid = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        const cardset = await CardSet.getCardSetByUuid(req.params.setId)
        delete cardset._id
        cardset.cardCount = cardset.cards.length
        logger.log('info', `Cardset with uuid ${cardset.uuid} created by user ${req.locals.user.uuid}`)
        res.status(200).send({ "cardset": cardset})
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.updateCardSet = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let owner = req.locals.cardset.owner,
        cardIds = req.locals.cardset.cards
    try {
        if(req.body.owner){
            const user = await User.getUserByUuid(req.body.owner)
            owner = user._id
        }
        if(req.body.cards){
            const cards = await Card.getCards(req.body.cards, "updatedAt", "ASC", 0, req.body.cards.length)
            cardIds = cards.map(card => {return card._id})
        }
        const config = {
            "names": req.body.names || req.locals.cardset.names,
            "public": req.body.public || req.locals.cardset.public,
            "iconUrl": req.body.iconUrl || req.locals.cardset.iconUrl,
            "owner": owner,
            "cards": cardIds
        }
        await CardSet.updateCardSet(req.params.setId, config)
        logger.log('error', `User ${req.locals.user.uuid} updated cardset ${req.params.setId}`)
        res.sendStatus(200)
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
    }    
}

exports.deleteCardSet = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await CardSet.deleteSet(req.params.setId)
        logger.log('error', `User ${req.locals.user.uuid} deleted cardset ${req.params.setId}`)
        res.sendStatus(200)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllCardsets = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        const cardsets = await CardSet.getAllBoards()
        logger.log('info', `Loaded all cardsets from DB for user ${req.locals.user.uuid}`)
        res.status(200).send({ "cardsets": cardsets })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getBearerCardSets = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        let container = [],
        setlist = []
        const ownCardsets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        container = container.concat(ownCardsets)
        const publicCardSets = await CardSet.getPublicCardSets()
        container = container.concat(publicCardSets)
        if(req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')){
            const wipCardSets = await CardSet.getWIPCardSets()
            container = container.concat(wipCardSets)
        }
        container.forEach(cardset => {
            if(setlist.length === 0 || !setlist.some(set => set.uuid === cardset.uuid)){
                setlist.push({
                    "name": cardset.names['en-US'],
                    "uuid": cardset.uuid,
                    "iconURL": cardset.iconUrl,
                    "public": cardset.public,
                    "owner": cardset.owner
                })
            }
        })
        res.status(200).send({ "cardsets": setlist })
        logger.log('info', `Loaded available cardsets for User ${req.locals.user.uuid} from DB.`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.addCards = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        const cards = await Card.getCards(req.body.cards, "updatedAt", "ASC", 0, req.body.cards.length)
        console.log("loaded cards from db", cards)
        const newIds = cards.map(card => {
            if(!req.locals.cardset.cards.includes(card._id)){
                return card._id
            }
        })
        await CardSet.addCards(req.params.cardSet, newIds)
        logger.log('info', `Added ${newIds.length} cards to set ${req.params.setId}`)
        res.sendStatus(204)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.removeCard = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try {
        await CardSet.removeCards(req.params.boardId, [req.locals.card._id])
        logger.log('info', `removed card ${req.body.uuid} from cardset ${req.params.setId}`)
        res.sendStatus(204)
        
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.removeCards = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try {
        const cards = await Card.getCards(req.body.cards, "updatedAt", "ASC", 0, req.body.cards.length)
        const cardIds = cards.map(card => {return card._id})
        await CardSet.removeCards(req.params.setId, cardIds)
        logger.log('info', `removed ${cardIds.length} members from cardset ${req.params.setId}`)
        res.sendStatus(204)
        
    } catch (err) {
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}