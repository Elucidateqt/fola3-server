const db = require('../models')
const Card = db.card
const CardSet = db.cardset
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Card Middleware'})
const { validationResult } = require('express-validator')


exports.loadCard = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const card = await Card.getCardByUuid(req.params.cardId)
        if(!card){
            return res.sendStatus(404)
        }
        req.locals.card = card
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.isOwnerOrManager = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if(req.locals.user.effectivePermissions.includes('API:CARDS:MANAGE')){
        return next()
    }
    try{
        const bearerSets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        const isOwnerOfCard = bearerSets.some(set => set._id.equals(req.locals.card.cardset))
        if(!isOwnerOfCard){
            return res.sendStatus(403)
        }
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}