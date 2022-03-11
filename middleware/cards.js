const db = require('../models')
const Card = db.card
const CardSet = db.cardset
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Board Middleware'})
const { validationResult } = require('express-validator')


exports.loadCard = async (req, res, next) => {
    console.log("loading card")
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
        console.log("card loaded")
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.isOwnerOrManager = async (req, res, next) => {
    console.log("checking permissions to manage card")
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if(req.locals.user.effectivePermissions.includes('API:CARDS:MANAGE')){
        return next()
    }
    try{
        const bearerSets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        let isOwnerOfCard = false
        isOwnerOfCard = bearerSets.some(set => set.cards.includes(req.locals.card._id))
        if(!isOwnerOfCard){
            return res.sendStatus(403)
        }
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}