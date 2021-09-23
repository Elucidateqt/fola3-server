const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
mongoose.Promise = global.Promise

const registry = require('../lib/registry')
const logger = registry.getService('logger')
const dbEvents = registry.createEventChannel('database')

const db = {}

db.mongoose = mongoose

db.user = require('./user')
db.role = require('./role')
db.project = require('./project')
db.survey = require('./survey')
db.feature = require('./feature')

db.ROLES = { "USER": "user", "MODERATOR": "moderator", "ADMIN" : "admin", "SUPER_ADMIN" : "super admin" }

db.PROJECT_ROLES = ["admin", "assistant", "observer"]

db.refreshTokens = []

db.initialize = async (SuperAdminName, SuperAdminMail, SuperAdminPw) => {
    try{
        //check if site wide roles exist in db and add them otherwise
        const roleCount = await db.role.getRoleCount()
        if(await roleCount === 0){
            logger.log("info","no roles found. creating roles...")
            for (const roleName of Object.values(db.ROLES)) {
                await db.role.createRole(roleName)
                logger.log("info", `Role ${roleName} created successfully. Remember to update reference-IDs of current users`)
            }
        }
        //check if any Users exist and add super admin otherwise
        let userCount = await db.user.getUserCount()
        if(userCount === 0){
            logger.log("info","no users found in DB. creating super user based on .env file...")
            const roleId = await db.role.getRoleIdByName(db.ROLES.SUPER_ADMIN)
            const user = await db.user.createUser(uuidv4(), SuperAdminName, SuperAdminMail, bcrypt.hashSync(SuperAdminPw,10), roleId)
            logger.log("info", "Super User created successfully")
        }
    }catch(err){
        logger.log('error', err)
    }
}

module.exports = db