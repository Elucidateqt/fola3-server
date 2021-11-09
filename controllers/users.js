const db = require('../models')
const User = db.user
const Role = db.role
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: "User-Controller" })

exports.createUser = async (username, email, password, roleName) => {
    try{
        //use user-role as default-case
        roleName = roleName || 'user'
        const roleId = await Role.getRoleIdByName(roleName)
        const user = await User.createUser(uuidv4(), username, email, bcrypt.hashSync(password,10), roleId)
        res.status(200).send({ "message": "userCreated", "user": user })
    }catch(err){
        console.error(`Error creating User in Authcontroller: \n ${err}`)
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
    try{
        let roleIds = []
        await Promise.all(req.body.roles.map(async (role) => {
            roleIds.push(await Role.getRoleIdByName(role))
        }))
        await User.updateUser(req.params.userId, req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), roleIds)
        res.sendStatus(204) 
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

exports.deleteUser = async (req, res) => {
    try{
        User.deleteUser(req.params.userId)
        res.sendStatus(204)
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}