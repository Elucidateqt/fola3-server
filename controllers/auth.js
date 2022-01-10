const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role
const { validationResult } = require('express-validator')
const registry = require('../lib/registry')
const redis = registry.getService("redis")

const logger = registry.getService('logger').child({ component: 'authController'})

const signUp = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
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
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
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
        const accessToken = await generateAccessToken(user.uuid)
        const tokenId = uuidv4()
        const refreshToken = jwt.sign({"uuid": user.uuid}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: parseInt(process.env.REFRESH_TOKEN_LIFETIME), jwtid: tokenId})
        await redis.set(`sessions:${user.uuid}:${tokenId}`, JSON.stringify({"ip": req.ip, "token": refreshToken}),
            {
                EX: process.env.REFRESH_TOKEN_LIFETIME
            }
        )
        res.json({
            "message": "loginSuccessful",
            "refreshToken": refreshToken,
            "accessToken": accessToken
        });
        logger.log('info',`User ${user.username} logged in`)
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
    }
}

const signOut = async (req, res) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null) return res.sendStatus(401)
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                logger.log("error", err)
                return res.sendStatus(403)
            }
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            logger.log("info", `User ${data.uuid} signed out`)
            return res.sendStatus(204)
        })
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

const refreshAccessToken = async (req, res) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null) return res.sendStatus(401)
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                return res.sendStatus(403)
            }
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            const accessToken = await generateAccessToken(data.uuid)
            const refreshToken = await generateRefreshToken(data.uuid)
            logger.log('info', `Tokens refreshed by user ${data.uuid}`)
            res.json({accessToken: accessToken, refreshToken: refreshToken})
        })
    }catch(err){
        logger.log('error', err)
        return res.sendStatus(500)
    }
}

const generateRefreshToken = async (userId) => {
    try {
        const tokenId = uuidv4()
        const refreshToken = jwt.sign({"uuid": data.uuid}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: parseInt(process.env.REFRESH_TOKEN_LIFETIME), jwtid: tokenId})
        await redis.set(`sessions:${data.uuid}:${tokenId}`, JSON.stringify(refreshToken),
            {
                EX: process.env.REFRESH_TOKEN_LIFETIME
            }
        )
    } catch (err) {
        throw new Error(`Error generating refreshtoken for user ${userId}`)
    }
}


const generateAccessToken = async (uuid) => {
    try{
        return jwt.sign({"uuid": uuid}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: parseInt(process.env.ACCESS_TOKEN_LIFETIME), jwtid: uuidv4()})
    }catch(err){
        throw new Error(`Error generating accesstoken for user ${uuid}`)
    }
}

module.exports = { signUp, signIn, signOut, refreshAccessToken, generateAccessToken }