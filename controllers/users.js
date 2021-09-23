const db = require('../models')
const User = db.user
const Role = db.role
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')

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
        users.forEach(user => userList.push({uuid: user.uuid, username: user.username, email: user.email, role: user.role.name}))
        res.send({ "userList": userList })
    }catch(err){
        console.error(err)
        res.sendStatus(500)
    }
}