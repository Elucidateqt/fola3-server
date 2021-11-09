
const db = require('../models')
const Permission = db.permission
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'Permission-Controller'})

exports.createPermission = async (req, res) => {
    try{
        await Permission.createPermission(req.body.name)
        logger.log('info', `Permission created by User ${req.user.uuid}`)
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
