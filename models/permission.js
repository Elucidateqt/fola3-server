const mongoose = require('mongoose')

const PermissionSchema = new mongoose.Schema({
    "name": {
        type: String,
        required: true
    }
})

PermissionSchema.pre('save', function(next) {
    const permission = this
    //give all created permissions to super admin
    this.model('Role').update({ "name": "super admin" },
    {$push: {"permissions": permission._id}},
    next);
});

PermissionSchema.pre('remove', function(next) {
    const permission = this
    // Remove permission from all roles that have it
    this.model('Role').update({ "permissions": permission._id},
    {$pull: {"permissions": permission._id}},
    next);
});

const Permission = new mongoose.model(
    "Permission",
    PermissionSchema
)

const createPermission = async (permissionName, creatorId) => {
    try{
        const result = await new Permission({
            "name": permissionName
        }).save()
        return result
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

const deletePermission = async (name) => {
    try{
        await Permission.deleteOne({"name": name})
    }catch(err){
        throw new Error(`Error in modules.permission.deletePermission: \n ${err}`)
    }
}

module.exports = { createPermission, getAllPermissions, getPermissionsByNameList, getPermissionCount, deletePermission }