const db = require('../models')
const CardSet = db.cardset
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Board Middleware'})
const { validationResult,  } = require('express-validator')


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