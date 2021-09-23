const mongoose = require('mongoose')


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
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        }
    })
)

const createUser = async (uuid, username, email, passHash, roleId) => {
    console.log(`uuid: ${uuid} \n username: ${username} \n email: ${email} \n passhash: ${passHash} \n roleId: ${roleId}`)
    try {
        const user = await new User({
            "uuid": uuid,
            "username": username,
            "email": email,
            "password": passHash,
            "role": roleId
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
        const users = await User.find().populate("role").exec()
        users.forEach(user => {
            user = {
                "uuid" : user.uuid,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        })
        console.log("users loaded", users)
        return users
    }catch(err){
        throw new Error(`Error loading all users from DB: ${err}`)
    }
}

const getUserByUuid = async (uuid) => {
    try{
        const result = await User.findOne({ "uuid": uuid }).populate("role").exec()
        const user = {
            "_id" : result._id,
            "uuid" : result.uuid,
            "username": result.username,
            "email": result.email,
            "password": result.password,
            "role": result.role.name
        }
        return user
    }catch(err){
        throw new Error(`Error loading User with UUID ${uuid} from DB: ${err}`)
    }
}

const getUserByEmail = async (email) => {
    try{
        const result = await User.findOne({ "email": email }).populate("role").exec()
        if(!result){
            return null
        }
        const user = {
                "_id" : result._id,
                "uuid" : result.uuid,
                "username": result.username,
                "email": result.email,
                "password": result.password,
                "role": result.role
        }
        return user
    }catch(err){
        throw new Error(`Error loading User with email ${email} from DB: ${err}`)
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
            users.push({
                "_id" : el._id,
                "uuid" : el.uuid,
                "username": el.username,
                "email": el.email,
                "password": el.password,
                "role": el.role
            })
        })
        return users
    }catch(err){
        throw new Error(`Error loading User with email ${email} from DB: ${err}`)
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

//TODO: remove user, once dependencies are resolved
module.exports = { getAllUsers, getUserByUuid, getUserByEmail, getUsersByEmail, getUserCount, createUser, usernameExists, emailExists }