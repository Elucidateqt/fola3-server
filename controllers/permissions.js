
const db = require('../models')
const Permission = db.permission
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'PermissionController'})

exports.createPermission = async (req, res) => {
    try{
        const permission = await Permission.createPermission(req.body.name)
        console.log("permission", permission)
        logger.log('info', `User ${req.user.uuid} created permission ${req.body.name}`)
        res.sendStatus(204)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllPermissions = async (req, res) => {
    try{
        const permissions = await Permission.getAllPermissions()
        res.json({ "message": "permissionsReceived", "permissions": permissions })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
    
}

exports.deletePermission = async (req, res) => {
    try{
        await Permission.deletePermission(req.params.permissionName)
        res.sendStatus(204)
        logger.log("info", `user ${req.user.uuid} deleted permission ${req.params.permissionName}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}
