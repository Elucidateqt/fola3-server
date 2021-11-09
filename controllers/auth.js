const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role
const Permission = db.permission

const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'authController'})

exports.signUp = async (req, res) => {
    try {
        const roleId = await Role.getRoleIdByName(db.ROLES.USER)
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), [roleId])
        logger.log("info", `User ${user.username} created successfully!`)
        res.status(204).send({ "message": "userCreated", "user": user})
    }catch(err){
        res.status(500).send({ "message": err })
    }
};


exports.signIn = async (req, res) => {
    try{
        const user = await User.getUserByEmail(req.body.email)
        if (!user) {
            return res.status(404).send({ message: "User Not found." });
        }
    
        const passwordValid = await bcrypt.compare(
            req.body.password,
            user.password
        )
    
        if (!passwordValid) {
            return res.status(401).send({
              accessToken: null,
              message: "Invalid Password!"
            });
        }
        let roleNames = user.roles.map(role => {return role.name})
        const userPayload = {
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            roles: roleNames,
            projectRoles: []
        }
        const accessToken = generateAccessToken(userPayload),
        refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET)
        db.refreshTokens.push(refreshToken)
        res.json({
            "message": "loginSuccessful",
            "refreshToken": refreshToken,
            "accessToken": accessToken
        });
        logger.log('info',`User ${userPayload.username} logged in`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

exports.signOut = (req, res) => {
    db.refreshTokens = db.refreshTokens.filter(token => token !== req.body.refreshToken)
    logger.log('info', `user ${req.user.uuid} logged out.`)
    res.sendStatus(204)
}

exports.refreshAccessToken = (req, res) => {
    const refreshToken = req.body.refreshToken
    if(refreshToken){
        if(!db.refreshTokens.includes(refreshToken)){
            return res.sendStatus(403)
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) =>{
            if(err){
                return res.sendStatus(403)
            }
            const userPayload = {
                uuid: user.uuid,
                username: user.username,
                email: user.email,
                roles: user.roles,
                projectRoles: user.projectRoles
            }
            const accessToken = generateAccessToken(userPayload)
            logger.log('info', `Access-Token refreshed by user ${user.uuid}`)
            res.json({accessToken: accessToken})
        })
    }else{
        res.sendStatus(401)
    }
}

//todo: test with normal user if SU gets role
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

exports.getRoles = async (req, res) => {
    try{
        const roles = await Role.getRoles()
        res.json({"roles": roles})
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }

}

exports.updateRole = async (req, res) => {
    try{
        let permissionIds = []
        const permissions = await Permission.getPermissionsByNameList(req.body.permissions)
        permissionIds = permissions.map(permission => {return permission._id})
        console.log(permissions)
        console.log(permissionIds)
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
    }catch(err){
        logger.log('error', err)
        res.sendStatus(501)
    }
}


function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_LIFETIME})
}