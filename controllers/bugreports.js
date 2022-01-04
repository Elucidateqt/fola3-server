const db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Report = db.bugreport
const { validationResult } = require('express-validator')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'projectController' })

const createBugreport = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        const bugreport = await Report.createBugreport(uuidv4(), req.user._id, req.body.trackerVisitorId, req.body.report)
        res.sendStatus(204)
        logger.log("info", `Bugreport created by user ${req.user.uuid}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

const getBugreport = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }
    try{
        let bugreport = await Report.getBugreport(req.params.reportId)
        logger.log("info", `Bugreport ${bugreport.uuid} retrieved for user ${req.user.uuid}`)
        return res.status(200).send({"report": bugreport})
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

const getAllBugreports = async (req, res) => {
    try {
        const bugreports = await Report.getAllBugreports()
        res.status(200).send({"reports": bugreports})
        logger.log("info", `User ${req.user.uuid} loaded all bugreports`)
    } catch (err) {
        logger.log("error", err)
        res.sendStatus(500)
    }
}

const deleteBugreport = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }
    try {
        await Report.deleteBugreport(req.params.reportId)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} deleted bugreport ${req.params.reportId}`)
    } catch (err) {
        logger.log("error", err)
        res.sendStatus(500)
    }
}

module.exports = { createBugreport, getBugreport, getAllBugreports, deleteBugreport }