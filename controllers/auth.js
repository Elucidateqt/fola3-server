const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const db = require('../models')
const User = db.user
const Role = db.role
const CardSet = db.cardset
const { validationResult } = require('express-validator')
const registry = require('../lib/registry')
const redis = registry.getService("redis")

const logger = registry.getService('logger').child({ component: 'authController'})

const ACCESS_TOKEN_LIFETIME = process.env.ACCESS_TOKEN_LIFETIME || 60
const REFRESH_TOKEN_LIFETIME = process.env.REFRESH_TOKEN_LIFETIME || 86400

const signUp = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try {
        const roleId = await Role.getRoleIdByName("user")
        const user = await User.createUser(uuidv4(), req.body.username, req.body.email, bcrypt.hashSync(req.body.password,10), [roleId])
        //create personal cardset for new users
        const userCardSet = await db.cardset.createCardSet(uuidv4(), `Cards of ${req.body.username}`, "", [], false, user._id)
        logger.log("info", `User ${user.username} created successfully!`)
        res.status(204).send({ "message": "userCreated", "user": user})
        next()
    }catch(err){
        res.status(500).send({ "message": err })
        next()
    }
};


const signIn = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return next()
    }
    try{
        const user = await User.getUserByEmail(req.body.email)
        if (!user) {
            res.status(404).send({ message: "User Not found." });
            return next()
        }
    
        const passwordValid = await bcrypt.compare(
            req.body.password,
            user.password
        )
    
        if (!passwordValid) {
            res.status(401).send({
              accessToken: null,
              message: "Invalid Password!"
            });
            return next()
        }
        const accessToken = await generateAccessToken(user.uuid, parseInt(ACCESS_TOKEN_LIFETIME))
        const refreshToken = await generateRefreshToken(user.uuid, parseInt(REFRESH_TOKEN_LIFETIME))
        res.set('Cache-Control', 'no-store')
        res.json({
            "message": "loginSuccessful",
            "refresh_token": refreshToken,
            "token_type": "Bearer",
            "expires_in": ACCESS_TOKEN_LIFETIME,
            "access_token": accessToken
        });
        logger.log('info',`User ${user.username} logged in`)
        next()
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

const signOut = async (req, res, next) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null){
            res.sendStatus(401)
            return next()
        }
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                logger.log("error", err)
                res.sendStatus(403)
                return next()
            }
            logger.log('debug', `Logout user ${data.uuid} with jti ${data.jti}`)
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            logger.log("info", `User ${data.uuid} signed out`)
            res.sendStatus(204)
            next()
        })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

const refreshAccessToken = async (req, res, next) => {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null || token === undefined){
            res.sendStatus(401)
            return next()
        }
        jwt.verify(token,process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
            if(err){
                logger.error(`Error verifying token in controllers.auth: \n ${err}`)
                res.sendStatus(403)
                return next()
            }
            await redis.del(`sessions:${data.uuid}:${data.jti}`)
            const accessToken = await generateAccessToken(data.uuid, parseInt(ACCESS_TOKEN_LIFETIME))
            const refreshToken = await generateRefreshToken(data.uuid, parseInt(REFRESH_TOKEN_LIFETIME))
            logger.log('info', `Tokens refreshed by user ${data.uuid}`)
            res.set('Cache-Control', 'no-store')
            res.json({
                "refresh_token": refreshToken,
                "token_type": "Bearer",
                "expires_in": process.env.ACCESS_TOKEN_LIFETIME,
                "access_token": accessToken
            })
            next()
        })
    }catch(err){
        logger.log('error', err)
        res.sendStatus(500)
        next()
    }
}

const generateRefreshToken = async (userId, ttl) => {
    try {
        const tokenId = uuidv4()
        const refreshToken = jwt.sign({
            "jti": tokenId,
            "exp": Math.floor(Date.now() / 1000) + ttl,
            "uuid": userId}, process.env.REFRESH_TOKEN_SECRET)
        await redis.set(`sessions:${userId}:${tokenId}`, JSON.stringify(refreshToken),
            {
                EX: ttl
            }
        )
        return refreshToken
    } catch (err) {
        throw new Error(`Error generating refreshtoken for user ${userId}: ${err}`)
    }
}


const generateAccessToken = async (uuid, ttl) => {
    try{
        const ttlExists = ttl !== undefined 
        const tokenPayload =  ({
            ...ttlExists && { exp: Math.floor(Date.now() / 1000) + ttl },
            "uuid": uuid
          });
        return jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET)
    }catch(err){
        throw new Error(`Error generating accesstoken for user ${uuid}`)
    }
}

module.exports = { signUp, signIn, signOut, refreshAccessToken, generateAccessToken }