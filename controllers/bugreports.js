const db = require('../models')
const { v4: uuidv4 } = require('uuid')
const Report = db.bugreport
const { validationResult } = require('express-validator')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'BugReportController' })

const createBugreport = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        const bugreport = await Report.createBugreport(uuidv4(), req.locals.user._id, req.locals.ua, req.body.route, req.body.summary, req.body.description)
        res.sendStatus(204)
        logger.log("info", `Bugreport created by user ${req.locals.user.uuid}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

const getBugreport = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() })
        return next()
    }
    try{
        let bugreport = await Report.getBugreport(req.params.reportId)
        logger.log("info", `Bugreport ${bugreport.uuid} retrieved for user ${req.locals.user.uuid}`)
        res.status(200).send({"report": bugreport})
        next()
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

const getAllBugreports = async (req, res, next) => {
    try {
        const bugreports = await Report.getAllBugreports()
        res.status(200).send({"reports": bugreports})
        logger.log("info", `User ${req.locals.user.uuid} loaded all bugreports`)
        next()
    } catch (err) {
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

const deleteBugreport = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() })
        return next()
    }
    try {
        await Report.deleteBugreport(req.params.reportId)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} deleted bugreport ${req.params.reportId}`)
        next()
    } catch (err) {
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

module.exports = { createBugreport, getBugreport, getAllBugreports, deleteBugreport }