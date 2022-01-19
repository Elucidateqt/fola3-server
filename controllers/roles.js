const db = require('../models')
const { v4: uuidv4 } = require('uuid')
const User = db.user
const Role = db.role
const { validationResult } = require('express-validator')

const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'rolesController'})

exports.createRole = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        const permissionIds = req.targetPermissions.map(permission => {return permission._id})
        const scope = req.body.scope
        const role = await Role.createRole(uuidv4(), req.body.name, permissionIds, scope)
        
        //give every new Role by default to super admins and self, so they can manage them further
        const superAdmins = await User.getUsersWithRole(db.ROLES.SUPER_ADMIN)
        let uuids = superAdmins.map(admin => {return admin.uuid})
        //add request-user, if he's not superadmin anyways
        if(!uuids.includes(req.locals.user.uuid)){
            uuids.push(req.locals.user.uuid)
        }
        await Promise.all(uuids.map(async uuid => User.giveUserMultipleRoles(uuid, [role._id])))
        res.sendStatus(204)
        logger.log("info", `user ${req.locals.user.uuid} created role ${req.body.name}`)
        logger.log("info", `role ${req.body.name} granted to superadmins`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.getAllRoles = async (req, res, next) => {
    try{
        const roles = await Role.getAllRoles()
        res.json({"roles": roles})
        logger.log("info", `Retrieved all roles for user ${req.locals.user.uuid}`)
        next()
    }catch(err){
        res.sendStatus(500)
        logger.log('error', err)
        next()
    }

}

exports.updateRole = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        let permissionIds = []
        const permissions = req.targetPermissions.map(permission => {return permission._id})
        permissionIds = permissions.map(permission => {return permission._id})
        await Role.updateRole(req.params.roleId,{"name": req.body.name, "permissions": permissions, "scope": req.body.scope})
        res.sendStatus(204)
        logger.log("info", `user ${req.locals.user.uuid} updated role ${req.params.roleId}.`)
        next()
    }catch(err){
        res.sendStatus(500)
        logger.log('error', err)
        next()
    }
}

exports.deleteRole = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        await Role.deleteRole(req.params.roleId)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} deleted role ${req.params.roleId}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}