const mongoose = require('mongoose')
const { role } = require('.')

const Role = mongoose.model(
    "Role",
    new mongoose.Schema({
        name: String
    })
)

const createRole = async (rolename) => {
    try{
        await new Role({"name": rolename}).save()
    }catch(err){
        throw new Error(`Error while creating Role ${rolename} in DB: \n ${err}`)
    }
}

const getRoleIdByName = async (rolename) => {
    try{
        const role = await Role.findOne({"name": rolename}).exec()
        return role._id
    }catch(err){
        throw new Error(`Error getting Role-ID from DB: \n ${err}`)
    }
}

const getRoleCount = async () => {
    try {
        const result = await Role.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while loading user-count from DB: \n ${err}`)
    }
}

module.exports = { Role, getRoleCount, createRole, getRoleIdByName }