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

//TODO: remove roles from projectroles if necessary
RoleSchema.pre('remove', async (doc) => {
    const role = this
    //remove role from all project-members if it's a project role
    if(role.attainOnProjectCreation === true){
        await this.model.projects.update({ "members": {$elemMatch: {"roles": role._id }}},
            {$pull: {"members.$.roles": role._id}},
        )
    }
    // Remove role from all users that have it
    await this.model('users').update({ "roles": {$elemMatch: role._id} }, 
    {$pull: {"roles": role._id}}
    );
});

//TODO: add role to project admins if necessary
RoleSchema.post('save', async (role) => {
    console.log("role received", role.constructor)
    if(role.attainOnProjectCreation && role.attainOnProjectCreation === true){
        const adminRole = await role.constructor.find({"name": "projectAdmin"})
        role.constructor.model('Project').update({ "members": {$elemMatch: {"roles": adminRole._id }}},
            {$push: {"members.$.roles": role._id}}
        )
    }
})


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

const getAllRoles = async () => {
    try{
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

const getRolesByNameList = async (nameList) => {
    try{
        const roles = await Role.find({"name": {$in: nameList}}).populate("permissions").exec()
        return roles
    }catch(err){
        throw new Error(`Error loading roles by namelist from DB: \n ${err}`)
    }
}

const getProjectRolesByNameList = async (nameList) => {
    try{
        const roles = await Role.find({"name": {$in: nameList}, "attainOnProjectCreation": true}).populate("permissions").exec()
        return roles
    }catch(err){
        throw new Error(`Error loading roles by namelist from DB: \n ${err}`)
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

module.exports = {getRoleCount, createRole, getAllRoles, updateRole, deleteRole, getRoleIdByName, getRolesByNameList, getProjectRolesByNameList, getProjectCreatorRoles, getRolePermissions, rolesContainPermissions, roleExists }