const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

const registry = require('../lib/registry')
const logger = registry.getService('logger')
const dbEvents = registry.createEventChannel('database')


const db = {}

db.permission = require('./permission')
db.user = require('./user')
db.role = require('./role')
db.project = require('./project')
db.bugreport = require('./bugreport')
db.ROLES = { "USER": "user", "ADMIN" : "admin", "SUPER_ADMIN" : "super admin"}

const PERMISSIONS = ["USERS:CREATE",  "USERS:VIEW", "USERS:PROFILE:UPDATE", "USERS:PASSWORD:UPDATE", "USERS:ROLES:UPDATE", "USERS:PERMISSIONBLACKLIST:MANAGE", "USERS:DELETE", "PROJECT:CREATE", "PROJECTS:VIEW", "PROJECT:MANAGE", "PROJECT:DELETE", "BUGREPORT:CREATE", "BUGREPORTS:READ", "BUGREPORT:DELETE", "ROLES:CREATE", "ROLES:GRANT", "ROLES:REVOKE", "ROLES:VIEW", "ROLES:UPDATE", "ROLES:DELETE", "PERMISSIONS:CREATE", "PERMISSIONS:VIEW", "PERMISSIONS:UPDATE", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE", "PERMISSIONS:DELETE"]

const BASE_ROLES = [
    {
        "rolename": "super admin",
        "permissions": PERMISSIONS,
        "scope": 'global'
    },
    {
        "rolename": "admin",
        "permissions": ["USERS:CREATE",  "USERS:VIEW", "USERS:PROFILE:UPDATE", "USERS:PASSWORD:UPDATE", "USERS:ROLES:UPDATE", "USERS:PERMISSIONBLACKLIST:MANAGE", "USERS:DELETE", "PROJECT:CREATE", "PROJECTS:VIEW", "PROJECT:MANAGE", "PROJECT:DELETE", "BUGREPORT:CREATE", "BUGREPORTS:READ", "ROLES:GRANT", "ROLES:REVOKE", "ROLES:VIEW", "PERMISSIONS:VIEW", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE"],
        "scope": 'global'
    },
    {
        "rolename": "moderator",
        "permissions": ["USERS:VIEW", "PROJECTS:VIEW", "BUGREPORT:CREATE"],
        "scope": 'global'
    },
    {
        "rolename": "projectAdmin",
        "permissions": ["PROJECT:MANAGE", "PROJECT:DELETE", "ROLES:GRANT", "ROLES:REVOKE", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE", "BUGREPORT:CREATE"],
        "scope": 'project'
    },
    {
        "rolename": "projectMember",
        "Permissions": ["PROJECTS:VIEW", "BUGREPORT:CREATE"],
        "scope": 'project'
    },
    {
        "rolename": "user",
        "permissions": ["PROJECT:CREATE", "BUGREPORT:CREATE"],
        "scope": 'global'
    }
]

db.initialize = async (SuperAdminName, SuperAdminMail, SuperAdminPw) => {
    try{
        //check if permissions for basic functionality exist in db and add them otherwise
        const permissionCount =  await db.permission.getPermissionCount()
        if(permissionCount === 0) {
            logger.log("info", "no permissions found in DB. creating permissions for basic functionality...")
            await Promise.all(PERMISSIONS.map(async (permission) => {
                await db.permission.createPermission(permission, uuidv4())
                logger.log("info", `Permission ${permission} created Successfully.`)
            }))
            logger.log("info", "All required permissions created successfully.")
        }
        //check if site wide roles exist in db and add super admin as a starting-point
        const roleCount = await db.role.getRoleCount()
        if(roleCount === 0){
            logger.log("info","no roles found. creating roles...")
            for (const role of Object.values(BASE_ROLES)) {
                const permissions = await db.permission.getPermissionsByNameList(role.permissions)
                const permissionIds = []
                permissions.forEach(permission => permissionIds.push(permission._id))
                await db.role.createRole(uuidv4(), role.rolename, permissionIds, role.scope)
                logger.log("info", `Role ${role.rolename} created successfully.`)
            }
        }
        //check if any Users exist and add super admin otherwise
        let userCount = await db.user.getUserCount()
        if(userCount === 0){
            logger.log("info","no users found in DB. creating super user based on .env file...")
            const roleIds = []
            for (const role of Object.values(BASE_ROLES)){
                const permissionId = await db.role.getRoleIdByName(role.rolename)
                roleIds.push(permissionId)
            }
            const user = await db.user.createUser(uuidv4(), SuperAdminName, SuperAdminMail, bcrypt.hashSync(SuperAdminPw,10), roleIds)
            logger.log("info", "Super User created successfully")
        }
    }catch(err){
        logger.log('error', err)
    }
}

module.exports = db