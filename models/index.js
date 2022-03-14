const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

const registry = require('../lib/registry')
const logger = registry.getService('logger')
const dbEvents = registry.createEventChannel('database')

const SUPER_ADMIN_NAME = process.env.ADMIN_ACC_USERNAME || 'admin'
const SUPER_ADMIN_PW = process.env.ADMIN_ACC_PW || 'admin'
const SUPER_ADMIN_EMAIL = process.env.ADMIN_MAIL || 'superadmin@apiTest.com'

const PROMETHEUS_USERNAME = process.env.prometheus_username || 'Prometheus'
const PROMETHEUS_PASSWORD = process.env.prometheus_password || '123456'
const PROMETHEUS_EMAIL = process.env.prometheus_mail || 'prometheus@apiTest.com'


const db = {}

db.permission = require('./permission')
db.user = require('./user')
db.role = require('./role')
db.board = require('./board')
db.card = require('./card')
db.cardset = require('./cardset')
db.deck = require('./deck')
db.bugreport = require('./bugreport')

const PERMISSIONS = ["USERS:CREATE",  "USERS:VIEW", "USERS:PROFILE:UPDATE", "USERS:PASSWORD:UPDATE", "USERS:ROLES:UPDATE", "USERS:PERMISSIONBLACKLIST:MANAGE", "USERS:DELETE", "BOARD:CREATE", "BOARDS:VIEW", "BOARD:MANAGE", "BOARD:DELETE", "BUGREPORT:CREATE", "BUGREPORTS:READ", "BUGREPORT:DELETE", "ROLES:CREATE", "ROLES:GRANT", "ROLES:REVOKE", "ROLES:VIEW", "ROLES:UPDATE", "ROLES:DELETE", "PERMISSIONS:CREATE", "PERMISSIONS:VIEW", "PERMISSIONS:UPDATE", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE", "PERMISSIONS:DELETE", "API:METRICS:READ", "API:CARDSETS:MANAGE", "API:CARDS:MANAGE"]

db.BASE_ROLES = [
    {
        "rolename": "super admin",
        "permissions": PERMISSIONS,
        "scope": 'global'
    },
    {
        "rolename": "metrics collector",
        "permissions": ["API:METRICS:READ"],
        "scope": "global"
    },
    {
        "rolename": "admin",
        "permissions": ["USERS:CREATE",  "USERS:VIEW", "USERS:PROFILE:UPDATE", "USERS:PASSWORD:UPDATE", "USERS:ROLES:UPDATE", "USERS:PERMISSIONBLACKLIST:MANAGE", "USERS:DELETE", "BOARD:CREATE", "BOARDS:VIEW", "BOARD:MANAGE", "BOARD:DELETE", "BUGREPORT:CREATE", "BUGREPORTS:READ", "ROLES:GRANT", "ROLES:REVOKE", "ROLES:VIEW", "PERMISSIONS:VIEW", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE"],
        "scope": 'global'
    },
    {
        "rolename": "moderator",
        "permissions": ["USERS:VIEW", "BOARDS:VIEW", "BUGREPORT:CREATE"],
        "scope": 'global'
    },
    {
        "rolename": "boardAdmin",
        "permissions": ["BOARD:MANAGE", "BOARD:DELETE", "ROLES:GRANT", "ROLES:REVOKE", "PERMISSIONS:GRANT", "PERMISSIONS:REVOKE", "BUGREPORT:CREATE"],
        "scope": 'board'
    },
    {
        "rolename": "boardMember",
        "Permissions": ["BOARDS:VIEW", "BUGREPORT:CREATE"],
        "scope": 'board'
    },
    {
        "rolename": "user",
        "permissions": ["BOARD:CREATE", "BUGREPORT:CREATE"],
        "scope": 'global'
    }
]

db.initialize = async () => {
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
            for (const role of Object.values(db.BASE_ROLES)) {
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
            let roleIds = []
            for (const role of Object.values(db.BASE_ROLES)){
                const roleId = await db.role.getRoleIdByName(role.rolename)
                roleIds.push(roleId)
            }
            const superadmin = await db.user.createUser(uuidv4(), SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, bcrypt.hashSync(SUPER_ADMIN_PW,10), roleIds)
            const adminCardSet = await db.cardset.createCardSet(uuidv4(), {"en-US": "my cards"}, "", [], false, superadmin._id)
            logger.log("info", "Super User created successfully")
        }
        let metricsUsers = await db.user.getUsersWithRole('metrics collector')
        let prometheusUser =  metricsUsers.find(user => user.username === PROMETHEUS_USERNAME)
        if(prometheusUser !== undefined){
            return prometheusUser
        }
        logger.log('info',"User for Prometheus scraping not found. Creating user...")
        const roleId = await db.role.getRoleIdByName('metrics collector')
        prometheusUser = await db.user.createUser(uuidv4(), PROMETHEUS_USERNAME, PROMETHEUS_EMAIL, bcrypt.hashSync(PROMETHEUS_PASSWORD, 10), [roleId])
        logger.log("info","Prometeus user created successfully")
        return prometheusUser
    }catch(err){
        logger.log('error', err)
    }
}

module.exports = db