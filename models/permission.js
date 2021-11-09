const mongoose = require('mongoose')

const Permission = new mongoose.model(
    "Permission",
    new mongoose.Schema({
        "name": {
            type: String,
            required: true
        }
    })
)

const createPermission = async (permissionName, creatorId) => {
    try{
        await new Permission({
            "name": permissionName
        }).save()
    }catch(err){
        throw new Error(`Error while creating permission Role ${permissionName} in DB: \n ${err}`)
    }
}

const getAllPermissions = async () => {
    try{
        const result = await Permission.find({}).exec()
        let permissions = result.map((permission) => {return permission.name})
        return permissions
    }catch(err){
        throw new Error(`Error while getting all permissions from DB: \n ${err}`)
    }
}

const getPermissionsByNameList = async (namelist) => {
    try{
        const permissions = await Permission.find({"name": {$in: namelist}})
        return permissions
    }catch(err){
        throw new Error(`Error while getting permissions for namelist ${namelist} from DB: \n ${err}`)
    }
}

const getPermissionCount = async () => {
    try{
        const result = await Permission.estimatedDocumentCount().exec()
        return result
    }catch(err){
        throw new Error(`Error while getting permission count from DB: \n ${err}`)
    }
}

module.exports = { createPermission, getAllPermissions, getPermissionsByNameList, getPermissionCount }