
const db = require('../models')
const Permission = db.permission
const registry = require('../lib/registry')
const { v4: uuidv4 } = require('uuid')
const logger = registry.getService('logger').child({ component: 'PermissionController'})

exports.createPermission = async (req, res, next) => {
    try{
        const permission = await Permission.createPermission(req.body.name, uuidv4())
        logger.log('info', `User ${req.locals.user.uuid} created permission ${req.body.name}`)
        res.sendStatus(204)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.getAllPermissions = async (req, res, next) => {
    try{
        const permissions = await Permission.getAllPermissions()
        res.json({ "message": "permissionsReceived", "permissions": permissions })
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
    
}

exports.deletePermission = async (req, res, next) => {
    try{
        await Permission.deletePermission(req.params.permissionId)
        res.sendStatus(204)
        logger.log("info", `user ${req.locals.user.uuid} deleted permission ${req.params.permissionId}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}
