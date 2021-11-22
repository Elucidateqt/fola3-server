const mongoose = require('mongoose')
const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ "component": "UserModel" })


const User = mongoose.model(
    "User",
    new mongoose.Schema({
        uuid: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        roles: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        }]
    })
)

const createUser = async (uuid, username, email, passHash, roleIds) => {
    try {
        const user = await new User({
            "uuid": uuid,
            "username": username,
            "email": email,
            "password": passHash,
            "roles": roleIds
        }).save()
        return {
            "uuid": user.uuid,
            "username": user.username,
            "email": user.email,
            "password": user.password,
            "role": user.role
        }
    }catch(err){
        throw new Error(`Error while creating user in DB: \n ${err}`)
    } 
}

const getUserCount = async () => {
    try {
        const result = await User.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while loading user-count from DB: \n ${err}`)
    }
}

const getAllUsers = async () => {
    try{
        let users = []
        const result = await User.find().populate("roles").exec()
        result.forEach(user => {
            let roleNames = []
            user.roles.map(role => roleNames.push(role.name))
            user = {
                "uuid" : user.uuid,
                "username": user.username,
                "email": user.email,
                "roles": roleNames
            }
            users.push(user)
        })
        return users
    }catch(err){
        throw new Error(`Error loading all users from DB: ${err}`)
    }
}

const getUserByUuid = async (uuid) => {
    try{
        const result = await User.findOne({ "uuid": uuid }).populate("roles").exec()
        let roleNames = []
        result.roles.map(role => roleNames.push(role.name))
        const user = {
            "_id" : result._id,
            "uuid" : result.uuid,
            "username": result.username,
            "email": result.email,
            "password": result.password,
            "roles": roleNames
        }
        return user
    }catch(err){
        throw new Error(`Error loading User with UUID ${uuid} from DB: ${err}`)
    }
}

const getUserByEmail = async (email) => {
    try{
        const result = await User.findOne({ "email": email }).populate("roles").exec()
        if(!result){
            return null
        }
        const user = {
                "_id" : result._id,
                "uuid" : result.uuid,
                "username": result.username,
                "email": result.email,
                "password": result.password,
                "roles": result.roles
        }
        return user
    }catch(err){
        throw new Error(`Error loading User with email ${email} from DB: ${err}`)
    }
}

const getUsersByUuids = async (uuidList) => {
    try{
        const result = await User.find({ "uuid": {$in: uuidList} }).populate("roles").exec()
        if(!result){
            return null
        }
        let users = []
        result.forEach(el => {
            let roleNames = []
            el.roles.map(role => roleNames.push(role.name))
            users.push({
                "_id" : el._id,
                "uuid" : el.uuid,
                "username": el.username,
                "email": el.email,
                "password": el.password,
                "roles": roleNames
            })
        })
        return users
    }catch(err){
        throw new Error(`Error loading User with uuids ${uuidList} from DB: ${err}`)
    }
}

const getUsersByEmail = async (emailList) => {
    try{
        const result = await User.find({ "email": {$in: emailList} }).populate("role").exec()
        if(!result){
            return null
        }
        let users = []
        result.forEach(el => {
            let roleNames = []
            el.roles.map(role => roleNames.push(role.name))
            users.push({
                "_id" : el._id,
                "uuid" : el.uuid,
                "username": el.username,
                "email": el.email,
                "password": el.password,
                "roles": roleNames
            })
        })
        return users
    }catch(err){
        throw new Error(`Error loading User with email ${email} from DB: ${err}`)
    }
}

const updateUser = async (uuid, username, email) => {
    try{
        await User.findOneAndUpdate({"uuid": uuid},{
            "username": username,
            "email": email,
        })
    }catch(err){
        throw new Error(`Error in models.user.updateUser: \n ${err}`)
    }
}

const updateUserPassword = async (uuid, passHash) => {
    try{
        await User.findOneAndUpdate({"uuid": uuid},{
            "password": passHash
        })
    }catch(err){
        throw new Error(`Error in models.user.updateUserPassword: \n ${err}`)
    }
}

const updateUserRoles = async (uuid, roleIds) => {
    try{
        await User.findOneAndUpdate({"uuid": uuid},{
            "roles": roleIds
        })
    }catch(err){
        throw new Error(`Error in models.user.updateUserRoles: \n ${err}`)
    }
}

const deleteUser = async (uuid) => {
    try{
        await User.findOneAndDelete({"uuid": uuid})
    }catch(err){
        throw new Error(`Error in models.user.deleteUser: \n ${err}`)
    }
}

const usernameExists = async (username) => {
    try{
        const count = await User.countDocuments({ "username": username })
        return count > 0
    }catch(err){
        throw new Error(`Error checking username ${username} existance in DB: \n ${err}`)
    }
}

const emailExists = async (email) => {
    try{
        const count = await User.countDocuments({ "email": email })
        return count > 0
    }catch(err){
        throw new Error(`Error checking email ${email} existance in DB: \n ${err}`)
    }
}

const giveUserMultipleRoles = async (userUuid, roleIds) => {
    try{
        //only give users the role if they don't have it yet
        let unownedRoles = []
        const user = await User.findOne(
            {"uuid": userUuid}).exec()
        await Promise.all(roleIds.map(async (id) => {
            if(!user.roles.includes(id)){
                unownedRoles.push(id)
            }
        }))
        if(unownedRoles.length > 0){
            User.updateOne({"uuid": userUuid},
            {$push: {"roles": {$each: unownedRoles}}}
            ).exec()
        }
    }catch(err){
        logger.log("error", err)
        res.sendStatus(500)
    }
}

const getUsersWithRole = async (rolename) => {
    try{
        const result  = await User.aggregate([
            {$match: {} },
            {$unwind: '$roles'},
            {$lookup: {
                from: 'roles',
                localField: 'roles',
                foreignField: '_id',
                as: 'roles'
            }},
            {$unwind: '$roles'},
            {$group: {
                "_id": "$_id",
                "uuid": { "$first": "$uuid" },
                "name": { "$first": "$name" },
                "email": { "$first": "$email" },
                "roles": {
                    "$push": "$roles.name"
                }
            }},
            {$match: {"roles": rolename}}
        ]).exec()
        if(result.length === 0){
            return null
        }
        return result
    }catch(err){
        throw new Error(`Error loading users with role ${rolename} from DB: \n ${err}`)
    }
}

module.exports = { getAllUsers, getUserByUuid, getUserByEmail, getUsersByUuids, getUsersByEmail, deleteUser, getUserCount, createUser, updateUser, updateUserPassword, updateUserRoles, giveUserMultipleRoles, getUsersWithRole, usernameExists, emailExists }