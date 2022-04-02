const db = require('../models')
const CardSet = db.cardset
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Board Middleware'})
const { validationResult,  } = require('express-validator')

const UUIDexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i


exports.loadCardSet = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const cardset = await CardSet.getCardSetByUuid(req.params.setId)
        if(!cardset){
            return res.sendStatus(404)
        }
        req.locals.cardset = cardset
        next()
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

exports.checkQueryCardsets = async (setList, { req }) => {
    const sets = setList.split(',')
    if(sets.some(id => !UUIDexp.test(id))){
        throw new Error(`sets.invalid_value`)
    }
    if(!req.locals){
        req.locals = {}
    }
    //attach cardsets to request since we have to load them anyways, prevents redundant db-hits in controllers
    req.locals.cardsets = []
    await Promise.all(sets.map(async (setId) => {
        const cardSet = await CardSet.getCardSetByUuid(setId)
        if(cardSet.public === false){
            const notAllowed = req.locals.user._id != cardSet.owner && !req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')
            if(notAllowed){
                throw new Error("auth.unauthorized")
            }
        }
        req.locals.cardsets.push(cardSet)
    }))
    return true
}

exports.isOwnerParamValid = async (owner, { req }) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if(UUIDexp.test(owner) || owner ==='public'){
        return true
    }
    throw new Error(`owner.invalid`)
}

exports.isOwnerOrManager = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (req.locals.cardset.public === false) {
        const notAllowed = req.locals.user._id != req.locals.cardset.owner && !req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')
        if(notAllowed){
            return res.sendStatus(403)
        }
    }
    next()
}