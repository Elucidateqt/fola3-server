const mongoose = require('mongoose')

const RoleSchema = new mongoose.Schema({
    "name": {
        type: String,
        required: true,
        unique: true
    },
    "attainOnProjectCreation": Boolean,
    "permissions": [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
        required: true
    }]
})

RoleSchema.pre('remove', function(next) {
    const role = this
    // Remove role from all users that have it
    this.model('users').update({ "roles": {$elemMatch: role._id} }, 
    {$pull: {"permissions": role._id}},
    next);
});


const Role = mongoose.model(
    "Role",
    RoleSchema
)


const createRole = async (rolename, permissionIds, attainOnProjectCreation) => {
    try{
        const result = await new Role({
            "name": rolename,
            "permissions": permissionIds,
            "attainOnProjectCreation": attainOnProjectCreation
        }).save()
        const role = {
            "_id": result._id,
            "name": result.name,
            "attainOnProjectCreation": result.attainOnProjectCreation
        }
        return role
    }catch(err){
        throw new Error(`Error while creating Role ${rolename} in DB: \n ${err}`)
    }
}

//TODO: finish
const getRoles = async () => {
    try{
        //const result = await Role.find({}).populate("permissions").exec()

        const roles  = await Role.aggregate([
            {$match: {} },
            {$unwind: '$permissions'},
            {$lookup: {
                from: 'permissions',
                localField: 'permissions',
                foreignField: '_id',
                as: 'permission'
            }},
            {$unwind: '$permission'},
            {$group: {
                "_id": "$_id",
                "name": {"$first": "$name"},
                "attainOnProjectCreation": {"$first": "$attainOnProjectCreation"},
                "permissions": {
                    $push: "$permission.name"
                } 
            }},
            {$project: {'_id': 0}}
        ]).exec()
        return roles
    }catch(err){
        throw new Error(`Error loading all projects from DB: \n ${err}`)
    }
}

const getProjectCreatorRoles = async () => {
    try{
        const results = await Role.find({ "attainOnProjectCreation": true }).exec()
        let roles = []
        results.forEach(result => {
            roles.push({
                "_id": result._id,
                "name": result.name,
                "permissions": result.permissions
            })
        })
        return roles
    }catch(err){
        throw new Error(`Error while creating Role ${rolename} in DB: \n ${err}`)
    }
}

const getRolePermissions = async (rolename) => {
    try{
        const result = await Role.aggregate([
            {$match: {"name": rolename}},
            {$unwind: "$permissions"},
            {$lookup: {
                from: "permissions",
                localField: "permissions",
                foreignField: "_id",
                as: "permission"
            }},
            {$unwind: "$permission"},
            {$group: {
                "_id": "$_id",
                "permissions": {
                    $push: "$permission.name"
                } 
            }},
            {$project: {
                "permissions": 1
            }}
        ])
        if(result.length > 0 && result[0].hasOwnProperty("permissions")){
            return result[0].permissions
        }
        return []
    }catch(err){
        throw new Error(`Error while getting Role-Permissions of ${rolename} from DB: \n ${err}`)
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

const rolesContainPermissions = async (roles, permissions) => {
    try{
        let userPermissions = await Promise.all(roles.map(async (rolename) => {
            return await getRolePermissions(rolename)
        }))
        userPermissions = userPermissions.flat()
        return permissions.every(permission => userPermissions.includes(permission))
    }catch(err){
        throw new Error(`Error in models.role.rolesContainPermissions: \n ${err}`)
    }

}

const roleExists = async (roleName) => {
    try{
        const result = await Role.exists({"name": roleName})
        return result
    }catch(err){
        throw new Error(`Error in models.role.roleExists: \n ${err}`)
    }
}

const updateRole = async (roleName, newRole) => {
    try{
        await Role.updateOne({"name": roleName},{
            "name": newRole.name,
            "permissions": newRole.permissions,
            "attainOnProjectCreation": newRole.attainOnProjectCreation
        })
    }catch(err){
        throw new Error(`Error in models.role.roleExists: \n ${err}`)
    }
}

const deleteRole = async (roleName) => {
    try{
        await Role.deleteOne({"name": roleName})
    }catch(err){
        throw new Error(`Error in models.role.deleteRole: \n ${err}`)
    }
}

module.exports = {getRoleCount, createRole, getRoles, updateRole, deleteRole, getRoleIdByName, getProjectCreatorRoles, getRolePermissions, rolesContainPermissions, roleExists }