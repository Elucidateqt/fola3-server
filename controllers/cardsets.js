db = require('../models')
const { v4: uuidv4 } = require('uuid')
const CardSet = db.cardset
const Card = db.card
const User = db.user
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'cardSetController' })
const { validationResult } = require('express-validator')

const PUBLIC_EMAIL = process.env.PUBLIC_ACC_MAIL || 'public@apiTest.com'

exports.createCardSet = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    let setName = req.body.name,
        owner = null
    try{
        if(req.body.owner === 'public'){
            owner = await User.getUserByEmail(PUBLIC_EMAIL)
            if(!owner){
                logger.error('Public user not found in DB')
                return res.sendStatus(500)
            }
        }else{
            owner = await User.getUserByUuid(req.body.owner)
            if(!owner){
                return res.sendStatus(404)
            }
        }
        const config = {
            "uuid": uuidv4(),
            "name": setName,
            "owner": owner._id,
            "public": req.body.public || false,
            "iconUrl": req.body.iconUrl
        }
        const cardset = await CardSet.createCardSet(config.uuid, config.name, config.iconUrl, config.public, config.owner)
        delete cardset._id
        delete cardset.__v
        cardset.owner = req.body.owner
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
            if(!bearerIsOwner && !req.locals.user.effectivePermissions.includes('API:CARDSETS:MANAGE')){
                return res.sendStatus(403)
            }
        }
        const config = {
            "public": public,
            "owner": ownerId
        }
        const sets = await CardSet.getCardSets(config)
        sets.forEach(set => {
            delete set._id
            delete set.__v
            set.owner = req.query.owner
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
    let setOwner = req.locals.cardset.owner,
    isPublic = req.locals.cardset.public
    try {
        if(req.body.owner){
            if(req.body.owner === 'public'){
                setOwner = User.getUserByEmail(PUBLIC_EMAIL)
            }else{
                setOwner = await User.getUserByUuid(req.body.owner)
                if(!setOwner){
                    res.sendStatus(404)
                }
            }
        }
        if(req.body.public !== undefined){
            isPublic = req.body.public
        }
        const config = {
            "name": req.body.name || req.locals.cardset.name,
            "public": isPublic,
            "iconUrl": req.body.iconUrl || null,
            "owner": setOwner._id
        }
        const cardset = await CardSet.updateSet(req.params.setId, config)
        delete cardset._id
        delete cardset.__v
        cardset.owner = setOwner.email === PUBLIC_EMAIL ? 'public' : setOwner.uuid
        console.log("updated set", cardset)
        logger.log('error', `User ${req.locals.user.uuid} updated cardset ${req.params.setId}`)
        res.json({"cardset": cardset})
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
        const cardsets = await CardSet.getAllCardsets()
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
        let setlist = []
        const ownCardsets = await CardSet.getCardSetsOfUser(req.locals.user._id)
        ownCardsets.forEach(cardset => {
            if(setlist.length === 0 || !setlist.some(set => set.uuid === cardset.uuid)){
                setlist.push({
                    "name": cardset.name,
                    "uuid": cardset.uuid,
                    "iconURL": cardset.iconUrl,
                    "public": cardset.public,
                    "owner": req.locals.user.uuid
                })
            }
        })
        res.json({ "cardsets": setlist })
        logger.log('info', `Loaded available cardsets for User ${req.locals.user.uuid} from DB.`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}