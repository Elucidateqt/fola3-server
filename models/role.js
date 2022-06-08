const mongoose = require('mongoose')

const RoleSchema = new mongoose.Schema(
    {
        "uuid": {
            type: String,
            required: true
        },
        "name": {
            type: String,
            required: true,
            unique: true
        },
        "scope": {
            type: String,
            required: true
        },
        "permissions": [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Permission",
            required: true
        }]
    },
    { timestamps: true }
)

/**
 * Cascading delete for roles that removes the deleted role
 * from all users or board-members, depending on the role's scope.
 */
RoleSchema.pre('remove', async (doc) => {
    const role = this
    //remove role from all board-members if it's a board role
    if(role.scope === 'board'){
        await this.model.boards.update({ "members": {$elemMatch: {"roles": role._id }}},
            {$pull: {"members.$.roles": role._id}},
        )
    }
    // Remove role from all users that have it
    await this.model('users').update({ "roles": {$elemMatch: role._id} }, 
    {$pull: {"roles": role._id}}
    );
});

/**
 * middleware function to give any newly created board-roles to all board-admins for
 * local management
 */
RoleSchema.post('save', async (role) => {
    if(role.scope === 'board'){
        const adminRole = await role.constructor.find({"name": "boardAdmin"})
        role.constructor.model('Board').update({ "members": {$elemMatch: {"roles": adminRole._id }}},
            {$push: {"members.$.roles": role._id}}
        )
    }
})


const Role = mongoose.model(
    "Role",
    RoleSchema
)


const createRole = async (uuid, rolename, permissionIds, scope) => {
    try{
        const result = await new Role({
            "uuid": uuid,
            "name": rolename,
            "permissions": permissionIds,
            "scope": scope
        }).save()
        const role = {
            "_id": result._id,
            "name": result.name,
            "scope": result.scope
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
                "uuid": {"$first": "$uuid"},
                "name": {"$first": "$name"},
                "scope": {"$first": "$scope"},
                "permissions": {
                    $push: "$permission.name"
                } 
            }},
            {$project: {'_id': 0}}
        ]).exec()
        return roles
    }catch(err){
        throw new Error(`Error loading all roles from DB: \n ${err}`)
    }
}

const getBoardRoles = async () => {
    try{
        const results = await Role.find({ "scope": "board" }).exec()
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

const getRoleByUuid = async (uuid) => {
    try{
        const role = await Role.findOne({"uuid": uuid}).exec()
        return role
    }catch(err){
        throw new Error(`Error in models.role.getRoleByUuid: \n ${err}`)
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

const getRolesByUuidList = async (uuids) => {
    try{
        const roles = await Role.find({"uuid": {$in: uuids}}).populate("permissions").exec()
        return roles
    }catch(err){
        throw new Error(`Error loading roles by UUID list from DB: \n ${err}`)
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

const getBoardRolesByNameList = async (nameList) => {
    try{
        const roles = await Role.find({"name": {$in: nameList}, "scope": "board"}).populate("permissions").exec()
        return roles
    }catch(err){
        throw new Error(`Error loading roles by namelist from DB: \n ${err}`)
    }
}

const getRolesByIds = async(roleIds) => {
    try {
        const roles = await Role.find({"_id": {"$in": roleIds}}).populate("permissions").exec()
        return roles
    } catch (err) {
        throw new Error(`Error loading roles by Id list from DB: \n ${err}`)
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

const updateRole = async (uuid, newRole) => {
    try{
        await Role.updateOne({"uuid": uuid},{
            "name": newRole.name,
            "permissions": newRole.permissions,
            "scope": newRole.scope
        })
    }catch(err){
        throw new Error(`Error in models.role.roleExists: \n ${err}`)
    }
}

const deleteRole = async (uuid) => {
    try{
        await Role.deleteOne({"uuid": uuid})
    }catch(err){
        throw new Error(`Error in models.role.deleteRole: \n ${err}`)
    }
}

module.exports = {getRoleCount, createRole, getAllRoles, getRolesByIds, getRoleByUuid, updateRole, deleteRole, getRoleIdByName, getRolesByUuidList, getRolesByNameList, getBoardRolesByNameList, getBoardRoles, getRolePermissions, rolesContainPermissions, roleExists }