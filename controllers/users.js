const db = require('../models')
const User = db.user
const Role = db.role
const Permission = db.permission
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const registry = require('../lib/registry')
const redis = registry.getService('redis')
const logger = registry.getService('logger').child({ component: "User-Controller" })
const { validationResult } = require('express-validator')

exports.createUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        //use user-role as default-case
        roleName = 'user'
        const roleId = await Role.getRoleIdByName(roleName)
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), roleId)
        res.status(200).send({ "message": "userCreated", "user": user })
        logger.log("info", `Successfully created user ${user.username}`)
    }catch(err){
        logger.log("error",`Error creating User in Authcontroller: \n ${err}`)
        res.sendStatus(500)
    }

}

exports.getUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        let user = await User.getUserByUuid(req.params.userId)
        if(!user){
            res.sendStatus(404)
        }
        //remove data based on requester
        delete user.password
        user.permissions = user.permissions.filter(permission => !user.revokedPermissions.some(revokedPermission => revokedPermission._id.equals(permission._id)))
        user.roles = user.roles.map(role => {
            return {
                "name": role.name,
                "uuid": role.uuid
            }
        })
        if(!user._id.equals(req.locals.user._id)){
            if(!req.locals.user.effectivePermissions.some(permission => permission.name === 'API:USERS:ROLES:UPDATE')){
                delete user.roles
            }
            if(!req.locals.user.effectivePermissions.some(permission => permission.name === 'API:USERS:PERMISSIONBLACKLIST:MANAGE')){
                delete user.revokedPermissions
            }
            if(user.uuid !== req.locals.user.uuid && !req.locals.user.effectivePermissions.some(permission => permission.name === 'API:USERS:EMAIL:VIEW')){
                delete user.email
            }
        }
        delete user.permissions
        delete user._id
        res.status(200).send({"user": user})
        logger.log("info", `Retrieved User ${req.params.userId} for user ${req.locals.user.uuid}`)
    }catch(err){
        logger.log("error", `Error retrieving User ${req.params.userId}: \n ${err}`)
        res.sendStatus(500)
    }
}

exports.getAllUsers = async (req, res) => {
    try{
        const users = await User.getAllUsers()
        let userList = []
        users.forEach(user => userList.push({"uuid": user.uuid, "username": user.username}))
        res.send({ "userList": userList })
        logger.log("info", `Retrieved all users for user ${req.locals.user.uuid}`)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.getTokenBearer = async (req, res) => {
    try {
        let user = await User.getUserByUuid(req.locals.user.uuid)
        delete user._id
        delete user.password
        user.roles = user.roles.map(role => {
            return {"name": role.name, "uuid": role.uuid}
        })
        user.permissions = user.permissions.filter(permission => !user.revokedPermissions.some(revokedPermission => revokedPermission._id.equals(permission._id)))
        user.permissions = user.permissions.map(permission => {
            return {"name": permission.name, "uuid": permission.uuid}
        })
        user.revokedPermissions = user.revokedPermissions.map(permission => {
            return {"name": permission.name, "uuid": permission.uuid}
        })
        res.json({ "user": user })
    } catch (err) {
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.updateUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        await User.updateUser(req.params.userId, req.body.username, req.body.email)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} has updated profile of user ${req.params.userId}.`)
        
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        
    }
}

exports.updateUserRoles = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        const roles = await Role.getRolesByUuidList(req.body.roles)
        let roleIds = roles.map(role => role._id)
        const updatedRoles = await User.updateUserRoles(req.params.userId, roleIds)
        const cleanedRoles = updatedRoles.map(role => {
            return {
                "name": role.name,
                "uuid": role.uuid
            }
        })
        res.json({"roles": cleanedRoles})
        logger.log("info", `User ${req.locals.user.uuid} updated roles of user ${req.params.userId}`)
        
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        
    }
}

exports.revokeUserPermissions = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });  
        return 
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.addPermissionsToBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} revoked permissions of user ${req.params.userId}`)
        
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        
    }
}

exports.setRevokedPermissions = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });
        return 
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.setPermissionBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} revoked permissions of user ${req.params.userId}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500) 
    }
}

exports.removeRevokedPermission = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });  
        return
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList([req.params.permissionId])
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.removePermissionsFromBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} removed revoked permissions of user ${req.params.userId}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.updateBearerPassword = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return
    }
    try{
        await User.updateUserPassword(req.locals.user.uuid, bcrypt.hashSync(req.body.password,10))
        logger.log('info', `User ${req.locals.user.uuid} changed own password.`)
        res.sendStatus(204)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.updatePassword = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        await User.updateUserPassword(req.params.userId, bcrypt.hashSync(req.body.password,10))
        res.sendStatus(204)
        logger.log('info', `User ${req.locals.user.uuid} changed password of user ${req.params.userId}.`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.deleteUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return 
    }
    try{
        await User.deleteUser(req.params.userId)
        res.sendStatus(204)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.deleteTokenBearer = async (req, res, next) => {
    try{
        await User.deleteUser(req.locals.user.uuid)
        await redis.del(`sessions:${req.locals.user.uuid}:*`)
        res.sendStatus(204)
        logger.info(`User ${req.locals.user.username} deleted own account.`)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}