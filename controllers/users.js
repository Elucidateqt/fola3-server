const db = require('../models')
const User = db.user
const Role = db.role
const Permission = db.permission
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: "User-Controller" })
const { validationResult } = require('express-validator')

exports.createUser = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        //use user-role as default-case
        roleName = 'user'
        const roleId = await Role.getRoleIdByName(roleName)
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), roleId)
        res.status(200).send({ "message": "userCreated", "user": user })
    }catch(err){
        console.error(`Error creating User in Authcontroller: \n ${err}`)
    }

}

exports.getUser = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        let user = await User.getUserByUuid(req.params.userId)
        //remove internal id
        delete user._id
        res.status(200).send({"user": user})
        logger.log("info", `Retrieved User ${req.params.userId} for user ${req.user.uuid}`)
    }catch(err){
        logger.log("error", `Error retrieving User ${req.params.userId}: \n ${err}`)
        res.sendStatus(500)
    }
}

exports.getAllUsers = async (req, res) => {
    try{
        const users = await User.getAllUsers()
        let userList = []
        users.forEach(user => userList.push({"uuid": user.uuid, "username": user.username, "email": user.email, "roles": user.roles}))
        res.send({ "userList": userList })
        logger.log("info", `Retrieved all users for user ${req.user.uuid}`)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.updateUser = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        await User.updateUser(req.params.userId, req.body.username, req.body.email)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} has updated profile of user ${req.params.userId}.`)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.updateUserRoles = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        let roleIds = req.targetRoles.map(role => {return role._id})
        await User.updateUserRoles(req.params.userId, roleIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} updated roles of user ${req.params.userId}`)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.revokeUserPermissions = async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() });  
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.addPermissionsToBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} revoked permissions of user ${req.params.userId}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.setRevokedPermissions = async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() });  
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        await User.setPermissionBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} revoked permissions of user ${req.params.userId}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.removeRevokedPermission = async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() });  
    }
    try{
        const permissions = await Permission.getPermissionsByUuidList([req.params.permissionId])
        const permissionIds = permissions.map(permission => {return permission._id})
        console.log("permissionIds", permissionIds)
        await User.removePermissionsFromBlacklist(req.params.userId, permissionIds)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} removed revoked permissions of user ${req.params.userId}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.updatePassword = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        await User.updateUserPassword(req.params.userId, bcrypt.hashSync(req.body.password,10))
        res.sendStatus(204)
        logger.log('info', `User ${req.user.uuid} changed password of user ${req.params.userId}.`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.deleteUser = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try{
        User.deleteUser(req.params.userId)
        res.sendStatus(204)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}