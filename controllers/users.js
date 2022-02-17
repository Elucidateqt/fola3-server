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
      return next()
    }
    try{
        //use user-role as default-case
        roleName = 'user'
        const roleId = await Role.getRoleIdByName(roleName)
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), roleId)
        res.status(200).send({ "message": "userCreated", "user": user })
        logger.log("info", `Successfully created user ${user.username}`)
        next()
    }catch(err){
        logger.log("error",`Error creating User in Authcontroller: \n ${err}`)
        res.sendStatus(500)
        next()
    }

}

exports.getUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        const requestUserPermissions = req.locals.user.permissions.filter(permission => !req.locals.user.revokedPermissions.includes(permission))
        let user = await User.getUserByUuid(req.params.userId)
        //remove data based on requester
        delete user._id
        delete user.password
        user.permissions = user.permissions.filter(permission => !user.revokedPermissions.includes(permission))
        delete user.revokedPermissions
        //TODO: test this
        if(user.uuid !== req.locals.user.uuid && !requestUserPermissions.includes('USERS:MANAGE')){
            delete user.permissions
            delete user.email
            delete user.roles
        }
        res.status(200).send({"user": user})
        logger.log("info", `Retrieved User ${req.params.userId} for user ${req.locals.user.uuid}`)
        next()
    }catch(err){
        logger.log("error", `Error retrieving User ${req.params.userId}: \n ${err}`)
        res.sendStatus(500)
        next()
    }
}

exports.getAllUsers = async (req, res, next) => {
    try{
        const users = await User.getAllUsers()
        let userList = []
        users.forEach(user => userList.push({"uuid": user.uuid, "username": user.username}))
        res.send({ "userList": userList })
        logger.log("info", `Retrieved all users for user ${req.locals.user.uuid}`)
        next()
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

exports.getTokenBearer = async (req, res, next) => {
    try {
        let user = await User.getUserByUuid(req.locals.user.uuid)
        delete user._id
        delete user.password
        user.permissions = user.permissions.filter(permission => !user.revokedPermissions.includes(permission))
        delete user.revokedPermissions
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
      return next()
    }
    try{
        await User.updateUser(req.params.userId, req.body.username, req.body.email)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} has updated profile of user ${req.params.userId}.`)
        next()
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

exports.updateUserRoles = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        let roleIds = req.targetRoles.map(role => {return role._id})
        await User.updateUserRoles(req.params.userId, roleIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} updated roles of user ${req.params.userId}`)
        next()
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        next()
    }
}

exports.revokeUserPermissions = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });  
        return next()
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.addPermissionsToBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} revoked permissions of user ${req.params.userId}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.setRevokedPermissions = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });
        return next()
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.setPermissionBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} revoked permissions of user ${req.params.userId}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.removeRevokedPermission = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        res.status(400).json({ errors: errors.array() });  
        return next()
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList([req.params.permissionId])
        const permissionIds = permissions.map(permission => {return permission._id})
        console.log("permissionIds", permissionIds)
        await User.removePermissionsFromBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.locals.user.uuid} removed revoked permissions of user ${req.params.userId}`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.updatePassword = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        await User.updateUserPassword(req.params.userId, bcrypt.hashSync(req.body.password,10))
        res.sendStatus(204)
        logger.log('info', `User ${req.locals.user.uuid} changed password of user ${req.params.userId}.`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

exports.deleteUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        await User.deleteUser(req.params.userId)
        res.sendStatus(204)
        next()
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
        next()
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