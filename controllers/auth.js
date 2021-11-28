const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role

const registry = require('../lib/registry')
const logger = registry.getService('logger').child({ component: 'authController'})

const signUp = async (req, res) => {
    try {
        const roleId = await Role.getRoleIdByName(db.ROLES.USER)
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), [roleId])
        logger.log("info", `User ${user.username} created successfully!`)
        res.status(204).send({ "message": "userCreated", "user": user})
    }catch(err){
        res.status(500).send({ "message": err })
    }
};


const signIn = async (req, res) => {
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
        const accessToken = await generateAccessToken(user.uuid),
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

const signOut = (req, res) => {
    db.refreshTokens = db.refreshTokens.filter(token => token !== req.body.refreshToken)
    logger.log('info', `user ${req.user.uuid} logged out.`)
    res.sendStatus(204)
}

const refreshAccessToken = (req, res) => {
    const refreshToken = req.body.refreshToken
    if(refreshToken){
        if(!db.refreshTokens.includes(refreshToken)){
            return res.sendStatus(403)
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, data) =>{
            if(err){
                return res.sendStatus(403)
            }
            const accessToken = await generateAccessToken(data.uuid)
            logger.log('info', `Access-Token refreshed by user ${user.uuid}`)
            res.json({accessToken: accessToken})
        })
    }else{
        res.sendStatus(401)
    }
}


const generateAccessToken = async (uuid) => {
    try{
        const user = await User.getUserByUuid(uuid)
        const userPayload = {
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            roles: user.roles,
            permissions: user.permissions
        }
        return jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_LIFETIME})
    }catch(err){
        throw new Error(`Error generating accesstoken for user ${uuid}`)
    }
}

module.exports = { signUp, signIn, signOut, refreshAccessToken, generateAccessToken }