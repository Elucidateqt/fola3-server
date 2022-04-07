const db = require('../models')
const Deck = db.deck
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Deck Middleware'})
const { validationResult,  } = require('express-validator')

const UUIDexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i


exports.loadDeck = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const deck = await Deck.getDeckByUuid(req.params.deckId)
        if(!deck){
            return res.sendStatus(404)
        }
        req.locals.deck = deck
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.isOwnerParamValid = async (owner, { req }) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if(UUIDexp.test(owner) || owner ==='public'){
        return true
    }
    throw new Error(`deck.owner_invalid`)
}

exports.isOwnerOrManager = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (req.locals.deck.public === false) {
        const notAllowed = !req.locals.user._id.equals(req.locals.deck.owner._id) && !req.locals.user.effectivePermissions.includes('API:DECKS:MANAGE')
        if(notAllowed){
            return res.sendStatus(403)
        }
    }
    next()
}