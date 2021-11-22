const db = require('../models')
const User = db.user
const Role = db.role
const Permission = db.permission

const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'rolesController'})

exports.createRole = async (req, res) => {
    try{
        if(await Role.roleExists(req.body.name)){
            return res.status(403).send({ "message": "roleExists" })
        }
        const hasUserNewPermissions = await Role.rolesContainPermissions(req.user.roles, req.body.permissions)
        if(!hasUserNewPermissions){
            return res.status(403).send({ "message": "unownedPermission(s)" })
        }
        const permissions = await Permission.getPermissionsByNameList(req.body.permissions)
        const permissionIds = permissions.map(permission => {return permission._id})
        const attainOnProjectCreation = req.body.attainOnProjectCreation || false
        const role = await Role.createRole(req.body.name, permissionIds, attainOnProjectCreation)
        
        //give every new Role by default to super admins and self, so they can manage them further
        const superAdmins = await User.getUsersWithRole(db.ROLES.SUPER_ADMIN)
        let uuids = superAdmins.map(admin => {return admin.uuid})
        //add request-user, if he's not superadmin anyways
        if(!uuids.includes(req.user.uuid)){
            uuids.push(req.user.uuid)
        }
        await Promise.all(uuids.map(async uuid => User.giveUserMultipleRoles(uuid, [role._id])))
        res.sendStatus(204)
        logger.log("info", `user ${req.user.uuid} created role ${req.body.name}`)
        logger.log("info", `role ${req.body.name} granted to superadmins`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.getAllRoles = async (req, res) => {
    try{
        const roles = await Role.getAllRoles()
        res.json({"roles": roles})
        logger.log("info", `Retrieved all roles for user ${req.user.uuid}`)
    }catch(err){
        res.sendStatus(500)
        logger.log('error', err)
    }

}

exports.updateRole = async (req, res) => {
    try{
        let permissionIds = []
        const permissions = await Permission.getPermissionsByNameList(req.body.permissions)
        permissionIds = permissions.map(permission => {return permission._id})
        await Role.updateRole(req.params.roleName,{"name": req.body.name, "permissions": permissions, "attainOnProjectCreation": req.body.attainOnProjectCreation})
        res.sendStatus(204)
        logger.log("info", `user ${req.user.uuid} updated role ${req.params.roleName}.`)
    }catch(err){
        logger.log('error', err)
    }
}

exports.deleteRole = async (req, res) => {
    try{
        await Role.deleteRole(req.params.roleName)
        res.sendStatus(204)
        logger.log("info", `User ${req.user.uuid} deleted role ${req.params.roleName}`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(501)
    }
}